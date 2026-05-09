# EduRAG Backend — AGENTS.md

Guía técnica de referencia para agentes de IA y desarrolladores que trabajen en el módulo `backend/`. Leer antes de modificar, agregar o depurar cualquier archivo de este directorio.

---

## Propósito del Módulo

API REST construida con **FastAPI (Python 3.11)**. Expone todos los endpoints del sistema: autenticación, gestión de chatbots, carga de documentos y ejecución del pipeline RAG. Desplegada en **Azure App Service Linux** (`edurag-api`, Basic B1, Central US).

---

## Estructura de Archivos

```
backend/
├── main.py                 # FastAPI app, todos los endpoints, middleware CORS y rate limiting
├── settings.py             # Variables de entorno tipadas con Pydantic Settings
├── models.py               # Modelos Pydantic — request bodies y response schemas
├── auth.py                 # Middleware de autenticación JWT (get_current_user / opcional)
├── jwt_token.py            # create_jwt_token / verify_jwt_token — PyJWT HS256
├── password.py             # hash_password / verify_password — bcrypt
├── azure_cosmos_db.py      # CRUD async para las 4 colecciones de Cosmos DB
├── vector_store.py         # Cliente ChromaDB — add_documents / query_similar / delete
├── llm_client.py           # Abstracción LLMClient — Gemini activo / Claude stub
├── document_uploader.py    # Upload a Blob Storage + publicación en Azure Queue
├── configure_azure.py      # Script de utilidad: crea contenedores y colas en Azure
├── startup.sh              # Script de arranque en App Service
├── Dockerfile              # Imagen Docker (referencia — no en uso activo)
├── test_api.py             # Script de pruebas de integración contra la API
├── simple_test.py          # Pruebas unitarias básicas
├── requirements.txt        # Dependencias Python
├── .env                    # Variables de entorno locales (NO commitear)
└── .env.example            # Plantilla de variables de entorno
```

---

## Dependencias Principales

```txt
fastapi
uvicorn[standard]
pydantic-settings
azure-cosmos              # Cosmos DB async client
azure-storage-blob        # Blob Storage
azure-storage-queue       # Queue Storage
chromadb                  # Vector store local
google-generativeai       # Gemini API + embeddings
PyJWT                     # JWT propio HS256
bcrypt                    # Hash de contraseñas
python-multipart          # Soporte multipart/form-data (upload)
slowapi                   # Rate limiting
PyMuPDF                   # Extracción de texto PDF (usado en worker, importado en backend para embeddings)
```

---

## Módulos — Descripción Técnica

### `main.py`
Punto de entrada de la aplicación FastAPI. Contiene:
- Configuración de CORS (orígenes desde `settings.CORS_ORIGINS`).
- Rate limiter con `slowapi` (100 req/min por IP en `/chat/{id}`).
- Caché en memoria (`response_cache: dict`) — máx. 1 000 entradas, LRU simple.
- Todos los endpoints de la API (ver tabla en README raíz).
- La función `generate_embedding(text)` — llama a `text-embedding-004` con `task_type="retrieval_query"`.
- `get_default_system_prompt(tone, restriction_level)` — genera el prompt base según configuración del chatbot.

### `settings.py`
`Pydantic Settings` con validación de tipos. Carga desde `.env`. Valores por defecto seguros para desarrollo local.

```python
settings.COSMOS_DB_ENDPOINT      # URL Cosmos DB
settings.GOOGLE_API_KEY          # Gemini API
settings.JWT_SECRET              # Secret JWT (≥32 chars en producción)
settings.CHUNK_SIZE              # 500
settings.CHUNK_OVERLAP           # 50
settings.RETRIEVAL_TOP_K         # 5
settings.MAX_CACHE_SIZE          # 1000
settings.CORS_ORIGINS            # Lista de orígenes permitidos
```

### `auth.py`
Dos funciones de dependencia:

```python
# Requiere token válido — lanza 401 si no hay token o es inválido
user = await get_current_user(request)

# Acepta requests sin token — retorna {"sub": None, "role": "anonymous"}
user = await get_current_user_optional(request)
```

El payload del JWT expuesto: `{ sub, email, role }`.

### `jwt_token.py`
```python
token = create_jwt_token(user_id, email, role)  # expira en 7 días
payload = verify_jwt_token(token)                # retorna payload o None
```

Algoritmo HS256. Secret: `settings.JWT_SECRET`.

### `azure_cosmos_db.py`
CRUD async sobre las 4 colecciones. Nomenclatura de funciones:
```python
# Patrón: <verbo>_<entidad>(args)
await create_user(doc: dict)
await get_user(user_id: str)
await get_user_by_email(email: str)
await list_users(role: str)

await create_chatbot(doc: dict)
await get_chatbot(chatbot_id: str)
await update_chatbot(chatbot_id, updates, owner_id)
await delete_chatbot(chatbot_id, owner_id)
await list_chatbots(owner_id, published_only)

await create_document(doc: dict)
await get_document(document_id: str)
await update_document(document_id, updates, chatbot_id)
await list_documents(chatbot_id: str)
await delete_document(document_id, chatbot_id)

await create_conversation(doc: dict)
await get_conversation(conversation_id: str)
await save_conversation(doc: dict)
await list_conversations(chatbot_id: str)
```

**Regla crítica:** siempre pasar `partition_key` en consultas para evitar cross-partition queries y reducir consumo de RUs.

### `vector_store.py`
Interfaz sobre ChromaDB. Colección por chatbot: nombre `chatbot_{chatbot_id}`.

```python
add_documents(chatbot_id, chunks, embeddings, document_id)
query_similar(chatbot_id, query_embedding, top_k=5) → list[dict]
delete_chatbot_vectors(chatbot_id)
```

**Aislamiento:** `query_similar` solo busca dentro de la colección del `chatbot_id` indicado. Nunca buscar en colecciones de otros tenants.

### `llm_client.py`
Abstracción LLM con soporte multi-proveedor:

```python
class LLMClient:
    def generate(
        self,
        system_prompt: str,
        context: str,
        user_message: str,
        temperature: float
    ) -> str
```

- `provider="gemini"` → llama a `gemini-2.0-flash` (activo).
- `provider="claude"` → `_generate_claude()` lanza `NotImplementedError` (stub — pendiente Fase 2).

**Para agregar Claude:** implementar `_generate_claude()` usando `anthropic` SDK. No cambiar la firma de `generate()`.

### `document_uploader.py`
```python
blob_url = await upload_file_to_blob(content: bytes, blob_path: str, content_type: str)
publish_to_queue(message: dict)  # serializa a JSON y publica en Azure Queue
```

---

## Endpoints — Detalles de Implementación

### `POST /documents/upload`
- Acepta `multipart/form-data` con campos `file` (UploadFile) y `chatbot_id` (str).
- Valida MIME type contra lista permitida (`application/pdf`, `application/vnd.openxmlformats...`).
- Valida tamaño contra `settings.MAX_FILE_SIZE_MB` (20 MB).
- Ruta en Blob Storage: `documents/{chatbot_id}/{document_id}/{filename}`.
- Publica en Queue: `{ document_id, chatbot_id, blob_url, filename, mime_type }`.

### `POST /chat/{chatbot_id}`
Rate limit: `@limiter.limit("100/minute")` por IP.

Flujo:
1. Buscar chatbot en Cosmos DB.
2. Verificar caché (`response_cache[f"{chatbot_id}:{message[:50]}"]`).
3. Generar embedding de la pregunta.
4. `query_similar(chatbot_id, embedding, top_k=5)`.
5. Construir prompt con system_prompt + contexto + mensaje.
6. `llm.generate(system_prompt, context, message, temperature)`.
7. Actualizar caché (LRU: evict oldest si `len > MAX_CACHE_SIZE`).
8. Persistir conversación en Cosmos DB.

**Temperatures:**

| `restriction_level` | `temperature` |
|---|---|
| `strict` | `0.2` |
| `guided` | `0.5` |
| `open` | `0.8` |

---

## Variables de Entorno

```env
# Azure Cosmos DB
COSMOS_DB_ENDPOINT=https://edu-bot-cosmos.documents.azure.com:443/
COSMOS_DB_KEY=<primary-key>
COSMOS_DB_DATABASE=edubot

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=<connection-string>
AZURE_STORAGE_CONTAINER_NAME=documents
AZURE_QUEUE_CONNECTION_STRING=<connection-string>
AZURE_QUEUE_NAME=document-processing

# Microsoft Entra ID (referencia — login social futuro)
ENTRA_TENANT_ID=<tenant-id>
ENTRA_CLIENT_ID=<client-id>
ENTRA_CLIENT_SECRET=<client-secret>

# JWT
JWT_SECRET=<mínimo 32 chars — openssl rand -hex 32>

# Google AI
GOOGLE_API_KEY=<api-key>

# ChromaDB
CHROMA_DB_PATH=./chroma_data

# App
APP_HOST=0.0.0.0
APP_PORT=8000
CORS_ORIGINS=["https://delightful-sea-04066b61e.7.azurestaticapps.net","http://localhost:3000"]
MAX_FILE_SIZE_MB=20

# RAG
CHUNK_SIZE=500
CHUNK_OVERLAP=50
RETRIEVAL_TOP_K=5
MAX_CACHE_SIZE=1000
TTL_CONVERSATIONS_DAYS=90
```

---

## Ejecución Local

```bash
cd backend

# 1. Crear entorno virtual
python -m venv .venv
source .venv/bin/activate   # Linux/Mac
.venv\Scripts\activate      # Windows

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con credenciales reales

# 4. Iniciar servidor
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 5. Correr tests
python test_api.py
```

API disponible en `http://localhost:8000`. Documentación interactiva: `http://localhost:8000/docs`.

---

## Despliegue — App Service `edurag-api`

```bash
# ZIP deploy manual
cd backend
zip -r ../backend-deploy.zip . \
  --exclude "*.pyc" --exclude "__pycache__/*" \
  --exclude "chroma_data/*" --exclude ".env"

az webapp deploy \
  --name edurag-api \
  --resource-group EduBot-app \
  --src-path ../backend-deploy.zip \
  --type zip
```

O vía **GitHub Actions** — push a `main` dispara `.github/workflows/backend.yml` automáticamente.

**Startup command en App Service:** `bash startup.sh`

---

## Notas Importantes

- `auth.py` contiene código duplicado al final del archivo (artefacto de refactoring). Limpiar en la próxima iteración.
- El endpoint `/admin/teachers` no valida que el solicitante sea `admin`. Agregar `get_current_user` y verificación de `role == "admin"` antes de producción.
- ChromaDB persiste en disco en `./chroma_data` dentro del App Service. El almacenamiento del App Service no es persistente entre reinicios si se usa el plan Free. Con B1 el disco es persistente, pero se recomienda implementar backup periódico a Blob Storage.
- La función `generate_embedding()` en `main.py` hace una llamada síncrona a Google AI API. En alta concurrencia, considerar moverla a un executor para no bloquear el event loop.
