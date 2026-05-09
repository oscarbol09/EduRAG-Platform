# EduRAG — Plataforma SaaS Educativa con RAG

> Plataforma multi-tenant donde los docentes crean agentes conversacionales entrenados con sus propios documentos (PDF, DOCX), y los estudiantes los consumen a través de un marketplace centralizado o integrados en LMS externos (Moodle) vía `<iframe>`.

[![Backend CI/CD](https://github.com/oscarbol09/EduRAG/actions/workflows/backend.yml/badge.svg)](https://github.com/oscarbol09/EduRAG/actions/workflows/backend.yml)
[![Frontend CI/CD](https://github.com/oscarbol09/EduRAG/actions/workflows/frontend.yml/badge.svg)](https://github.com/oscarbol09/EduRAG/actions/workflows/frontend.yml)

---

## Tabla de Contenidos

- [Visión General](#visión-general)
- [Arquitectura del Sistema](#arquitectura-del-sistema)
- [Stack Tecnológico](#stack-tecnológico)
- [Estructura del Repositorio](#estructura-del-repositorio)
- [Modelo de Datos](#modelo-de-datos)
- [Pipeline RAG](#pipeline-rag)
- [API Reference](#api-reference)
- [Autenticación](#autenticación)
- [Configuración de Entorno](#configuración-de-entorno)
- [Despliegue](#despliegue)
- [CI/CD](#cicd)
- [Roles y Permisos](#roles-y-permisos)
- [Seguridad](#seguridad)
- [Estado del Proyecto](#estado-del-proyecto)
- [Extensibilidad LLM](#extensibilidad-llm)
- [Autores](#autores)

---

## Visión General

EduRAG resuelve un problema concreto en la educación digital: los materiales de clase (PDFs, apuntes, guías) están fragmentados y son difíciles de consultar. La plataforma permite a cualquier docente convertir sus documentos en un asistente conversacional inteligente, sin conocimientos de programación, y ponerlo a disposición de sus estudiantes en minutos.

**Principios de diseño:**

- **Costo cero post-primer mes** — toda la infraestructura opera sobre Azure Free Tiers y APIs gratuitas.
- **Aislamiento multi-tenant estricto** — los datos y vectores de cada docente están completamente separados.
- **Extensibilidad LLM** — el proveedor de IA (Gemini hoy, Claude mañana) se intercambia sin cambios en la lógica de negocio.

---

## Arquitectura del Sistema

```
┌────────────────────────────────────────────────────────────────────┐
│                       Azure  ·  EduBot-app RG                      │
│                                                                    │
│  ┌─────────────────┐   ┌──────────────────┐   ┌────────────────┐  │
│  │    Frontend      │   │     Backend       │   │     Worker     │  │
│  │  Next.js 16      │──▶│   FastAPI 0.1.0   │──▶│  Doc Processor │  │
│  │  Static Web Apps │   │   App Service B1  │   │  (async queue) │  │
│  │  edurag-frontend  │   │   edurag-api      │   │                │  │
│  └─────────────────┘   └────────┬─────────┘   └───────┬────────┘  │
│                                 │                      │           │
│               ┌─────────────────┼──────────────────────┘           │
│               ▼                 ▼                                  │
│  ┌──────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │   Cosmos DB       │  │  Blob Storage   │  │  Queue Storage   │  │
│  │  edu-bot-cosmos   │  │ edubotstore2026 │  │ document-        │  │
│  │  DB: edubot       │  │ container:      │  │ processing       │  │
│  │  4 colecciones    │  │  documents      │  │                  │  │
│  └──────────────────┘  └─────────────────┘  └──────────────────┘  │
│                                                                    │
│          ┌──────────────────────────────────────┐                  │
│          │  ChromaDB  (proceso local en App Svc) │                  │
│          │  Colección aislada por chatbot_id     │                  │
│          └──────────────────────────────────────┘                  │
└────────────────────────────────────────────────────────────────────┘
                               │
                  ┌────────────▼───────────┐
                  │   Google Gemini API     │
                  │   gemini-2.0-flash      │
                  │   text-embedding-004    │
                  └────────────────────────┘
```

---

## Stack Tecnológico

| Capa | Tecnología | Servicio Azure | Tier |
|---|---|---|---|
| Frontend SPA | Next.js 16 + Tailwind CSS + Radix UI | Azure Static Web Apps `edurag-frontend` | Free |
| API Backend | FastAPI (Python 3.11) + Uvicorn | Azure App Service Linux `edurag-api` | Basic B1 |
| Base de datos | Azure Cosmos DB for NoSQL | `edu-bot-cosmos` — DB: `edubot` | Free Tier permanente |
| Almacenamiento | Azure Blob Storage | `edubotstore2026` / container `documents` | Free (5 GB) |
| Cola asíncrona | Azure Queue Storage | `edubotstore2026` / queue `document-processing` | Free |
| Autenticación | JWT propio (PyJWT + bcrypt) | Microsoft Entra ID (referencia de tenant) | Free |
| Motor vectorial | ChromaDB (proceso local en App Service) | — | Gratuito |
| LLM | Google Gemini 2.0 Flash | Google AI API | Free tier (15 RPM, 1M tokens/día) |
| Embeddings | Google text-embedding-004 | Google AI API | Gratuito |

> **Nota sobre autenticación:** El plan original contemplaba Azure AD B2C, servicio que Microsoft descontinuó e integró en **Microsoft Entra External ID**. La implementación actual usa JWT propio firmado con HS256 (`jwt_token.py` + `auth.py`), con contraseñas hasheadas con bcrypt. Entra ID sigue siendo referenciado como proveedor de identidad social (tenant/client), pero el flujo de validación de tokens es completamente interno al backend.

---

## Estructura del Repositorio

```
/
├── backend/                        # API REST — FastAPI
│   ├── main.py                     # Aplicación principal + todos los endpoints
│   ├── settings.py                 # Variables de entorno (Pydantic Settings)
│   ├── models.py                   # Modelos Pydantic (request/response)
│   ├── auth.py                     # Middleware de autenticación JWT
│   ├── jwt_token.py                # create_jwt_token / verify_jwt_token (PyJWT)
│   ├── password.py                 # hash_password / verify_password (bcrypt)
│   ├── azure_cosmos_db.py          # CRUD async — 4 colecciones Cosmos DB
│   ├── vector_store.py             # Cliente ChromaDB
│   ├── llm_client.py               # Abstracción LLM (Gemini activo / Claude stub)
│   ├── document_uploader.py        # Blob Storage upload + Queue publisher
│   ├── configure_azure.py          # Script de utilidad para setup inicial Azure
│   ├── startup.sh                  # Script de arranque en App Service
│   ├── Dockerfile                  # Imagen Docker (referencia, no en uso activo)
│   ├── requirements.txt
│   ├── .env.example
│   └── AGENTS.md                   # Guía para agentes IA — backend
│
├── worker/                         # Procesador asíncrono de documentos
│   ├── queue_worker.py             # Loop principal — escucha Azure Queue Storage
│   ├── document_processor.py       # Pipeline: blob → texto → chunks → embeddings → ChromaDB
│   ├── azure_cosmos_db.py          # Cliente Cosmos DB (independiente del backend)
│   ├── vector_store.py             # Cliente ChromaDB (independiente del backend)
│   ├── settings.py                 # Variables de entorno del worker
│   ├── requirements.txt
│   ├── .env.example
│   └── AGENTS.md                   # Guía para agentes IA — worker
│
├── frontend/                       # SPA — Next.js 16
│   ├── src/
│   │   ├── app/                    # Next.js App Router
│   │   │   ├── page.tsx            # Home / landing
│   │   │   ├── login/              # Página de login
│   │   │   ├── teacher/            # Dashboard del docente
│   │   │   │   └── chatbots/new/   # Formulario de creación de chatbot
│   │   │   ├── marketplace/        # Marketplace público de chatbots
│   │   │   └── chat/[botId]/       # Interfaz de chat (embebible vía iframe)
│   │   ├── lib/
│   │   │   ├── api.ts              # Cliente HTTP centralizado
│   │   │   ├── types.ts            # Tipos TypeScript
│   │   │   ├── context.tsx         # Auth context (React)
│   │   │   └── utils.ts            # Funciones helper
│   │   └── components/             # Componentes reutilizables
│   ├── public/
│   ├── package.json
│   ├── next.config.ts
│   ├── staticwebapp.config.json    # Routing para Azure Static Web Apps
│   ├── .env.local
│   └── AGENTS.md                   # Guía para agentes IA — frontend
│
├── .github/
│   └── workflows/
│       ├── backend.yml             # CI/CD → Azure App Service
│       └── frontend.yml            # CI/CD → Azure Static Web Apps
│
├── AGENTS.md                       # Guía global para agentes IA
├── SPEC.md                         # Especificación técnica detallada
└── README.md                       # Este archivo
```

---

## Modelo de Datos

Todas las entidades persisten en **Azure Cosmos DB**, base de datos `edubot`. Se usa el patrón de documentos desnormalizados; las relaciones se expresan mediante referencias de `id`.

### `users` — partition key: `/id`

```json
{
  "id": "uuid-v4",
  "email": "string",
  "password": "bcrypt_hash (solo para auth_method: email_password)",
  "role": "teacher | student | admin",
  "auth_method": "pre_created | email_password | google | microsoft",
  "institution": "string",
  "country": "string",
  "is_active": true,
  "created_at": "2025-01-01T00:00:00Z"
}
```

### `chatbots` — partition key: `/owner_id`

```json
{
  "id": "uuid-v4",
  "owner_id": "users.id",
  "name": "string",
  "subject_area": "string",
  "education_level": "secondary | university",
  "tone": "formal | friendly | technical",
  "welcome_message": "string",
  "system_prompt_override": "string (opcional — reemplaza el prompt generado)",
  "restriction_level": "strict | guided | open",
  "llm_provider": "gemini | claude",
  "public_url": "/chat/{id}",
  "embed_code": "<iframe src='/chat/{id}' width='100%' height='600'></iframe>",
  "is_published": false,
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### `documents` — partition key: `/chatbot_id`

```json
{
  "id": "uuid-v4",
  "chatbot_id": "chatbots.id",
  "filename": "string",
  "mime_type": "application/pdf | application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "blob_url": "https://edubotstore2026.blob.core.windows.net/documents/{chatbot_id}/{doc_id}/{filename}",
  "status": "queued | processing | indexed | error",
  "chunk_count": 0,
  "error_message": "string (presente solo en status: error)",
  "created_at": "ISO8601",
  "processed_at": "ISO8601"
}
```

### `conversations` — partition key: `/chatbot_id`

```json
{
  "id": "uuid-v4",
  "chatbot_id": "chatbots.id",
  "student_id": "users.id | null (anónimo)",
  "messages": [
    { "role": "user | assistant", "content": "string", "timestamp": "ISO8601" }
  ],
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

> **TTL:** Configurar política de TTL en Cosmos DB a 90 días (`TTL_CONVERSATIONS_DAYS = 90`) para controlar el crecimiento de la colección `conversations`.

---

## Pipeline RAG

### Fase de Ingesta (asíncrona — via Azure Queue)

```
Docente sube archivo
        │
        ▼
POST /documents/upload
        │
        ├── Valida: MIME type (PDF / DOCX) y tamaño (máx 20 MB)
        ├── Sube archivo → Blob Storage: documents/{chatbot_id}/{doc_id}/{filename}
        ├── Crea registro en Cosmos DB  →  status: "queued"
        └── Publica mensaje en Azure Queue (document-processing)

Queue Worker — process loop (queue_worker.py)
        │
        ├── Descarga archivo desde Blob Storage
        ├── Extrae texto:
        │     PDF  →  PyMuPDF (fitz)
        │     DOCX →  python-docx
        ├── Chunking: RecursiveCharacterTextSplitter
        │     chunk_size=500 chars, chunk_overlap=50 chars
        ├── Genera embeddings por chunk → Google text-embedding-004
        │     task_type="retrieval_document"
        ├── Almacena vectores → ChromaDB (colección: chatbot_{id})
        └── Actualiza Cosmos DB  →  status: "indexed", chunk_count: N
```

### Fase de Consulta (síncrona — via API)

```
Estudiante envía mensaje
        │
        ▼
POST /chat/{chatbot_id}
        │
        ├── Verifica caché en memoria (dict Python, últimas 1 000 preguntas por chatbot)
        ├── Genera embedding de la pregunta → text-embedding-004 (task: retrieval_query)
        ├── Búsqueda de similitud en ChromaDB → top 5 fragmentos más relevantes
        ├── Construye prompt:
        │     system_prompt (override del docente o generado por tone+restriction)
        │     + contexto recuperado
        │     + pregunta del usuario
        ├── Llama a Gemini 2.0 Flash con temperature según restriction_level
        ├── Persiste conversación en Cosmos DB
        └── Retorna ChatResponse { response, conversation_id, sources }
```

### Niveles de Restricción

| Nivel | Temperature | Comportamiento del asistente |
|---|---|---|
| `strict` | `0.2` | Responde **solo** con información del contexto. No expande. |
| `guided` | `0.5` | Usa el contexto como base; puede complementar levemente. |
| `open` | `0.8` | El contexto es punto de partida; puede expandir y relacionar. |

Los tres modos se implementan íntegramente mediante **system prompting** — no hay cambios en la lógica de recuperación. Migrar a Claude solo requiere implementar `_generate_claude()` en `llm_client.py`.

---

## API Reference

### Sistema

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/` | — | Info y versión de la API |
| `GET` | `/health` | — | Health check (usar para keep-alive en App Service F1/B1) |
| `GET` | `/ready` | — | Readiness check — verifica ChromaDB disponible |

### Autenticación

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/auth/login` | — | Login email + password → devuelve JWT |
| `POST` | `/auth/register` | — | Registro de estudiantes (auto-servicio) |
| `GET` | `/auth/me` | JWT | Datos del usuario del token actual |

### Chatbots

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/chatbots` | Opcional | Listar chatbots (`?owner_id=`, `?published_only=true`) |
| `POST` | `/chatbots` | JWT | Crear chatbot |
| `GET` | `/chatbots/{id}` | — | Detalle de un chatbot |
| `PUT` | `/chatbots/{id}` | JWT (owner) | Actualizar configuración |
| `DELETE` | `/chatbots/{id}` | JWT (owner) | Eliminar chatbot + vectores ChromaDB |
| `POST` | `/chatbots/{id}/publish` | JWT (owner) | Publicar en marketplace |
| `GET` | `/chatbots/{id}/embed` | — | Devuelve `embed_code` e `public_url` |

### Documentos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/documents/upload` | — | Subir PDF/DOCX (`multipart/form-data`) |
| `GET` | `/documents` | — | Listar por chatbot (`?chatbot_id=`) |
| `GET` | `/documents/{id}` | — | Estado de procesamiento del documento |
| `DELETE` | `/documents/{id}` | — | Eliminar documento |

### Chat

| Método | Ruta | Límite | Descripción |
|---|---|---|---|
| `POST` | `/chat/{chatbot_id}` | 100 req/min por IP | Enviar mensaje — ejecuta pipeline RAG completo |
| `GET` | `/chat/{chatbot_id}/history` | — | Historial de una conversación (`?conversation_id=`) |

### Administración

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/admin/teachers` | — | Crear cuenta de docente (`auth_method: pre_created`) |
| `GET` | `/admin/teachers` | — | Listar todos los docentes |

> **Rate limiting:** implementado con `slowapi`. El endpoint de chat está limitado a **100 req/min por IP**. Revisar `main.py` para ajustar los límites.

---

## Autenticación

La plataforma usa un sistema de **JWT propio** (HS256) gestionado en `backend/jwt_token.py` y `backend/auth.py`. No depende de flujos OAuth externos en tiempo de ejecución.

| Flujo | Método | Descripción |
|---|---|---|
| Login email/password | `POST /auth/login` | Verifica bcrypt hash en Cosmos DB → emite JWT |
| Registro estudiante | `POST /auth/register` | Crea usuario con contraseña hasheada → emite JWT |
| Creación docente | `POST /admin/teachers` | Admin crea la cuenta; el docente recibe credenciales por fuera (`auth_method: pre_created`) |
| Validación | `auth.py` | Cada endpoint protegido extrae el Bearer token y llama a `verify_jwt_token()` |

El JWT contiene: `sub` (user_id), `email`, `role`, `exp`.

Microsoft Entra ID está configurado como proveedor de referencia (`ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`) para una futura integración de login social, pero los flujos OAuth (Google/Microsoft) no están activos en el MVP actual.

---

## Configuración de Entorno

### Backend — `backend/.env`

```env
# ── Azure Cosmos DB ──────────────────────────────────────────────────
COSMOS_DB_ENDPOINT=https://edu-bot-cosmos.documents.azure.com:443/
COSMOS_DB_KEY=<primary-key>
COSMOS_DB_DATABASE=edubot

# ── Azure Blob Storage ───────────────────────────────────────────────
AZURE_STORAGE_CONNECTION_STRING=<connection-string>
AZURE_STORAGE_CONTAINER_NAME=documents

# ── Azure Queue Storage ──────────────────────────────────────────────
AZURE_QUEUE_CONNECTION_STRING=<connection-string>
AZURE_QUEUE_NAME=document-processing

# ── Microsoft Entra ID (referencia — login social futuro) ────────────
ENTRA_TENANT_ID=<tenant-id>
ENTRA_CLIENT_ID=<client-id>
ENTRA_CLIENT_SECRET=<client-secret>

# ── JWT interno ──────────────────────────────────────────────────────
JWT_SECRET=<mínimo 32 caracteres aleatorios — usar openssl rand -hex 32>

# ── Google Gemini ────────────────────────────────────────────────────
GOOGLE_API_KEY=<api-key>

# ── ChromaDB ─────────────────────────────────────────────────────────
CHROMA_DB_PATH=./chroma_data

# ── App ──────────────────────────────────────────────────────────────
CORS_ORIGINS=["https://delightful-sea-04066b61e.7.azurestaticapps.net","http://localhost:3000"]
MAX_FILE_SIZE_MB=20
```

### Worker — `worker/.env`

```env
COSMOS_DB_ENDPOINT=https://edu-bot-cosmos.documents.azure.com:443/
COSMOS_DB_KEY=<primary-key>
COSMOS_DB_DATABASE=edubot
AZURE_STORAGE_CONNECTION_STRING=<connection-string>
AZURE_STORAGE_CONTAINER_NAME=documents
AZURE_QUEUE_CONNECTION_STRING=<connection-string>
AZURE_QUEUE_NAME=document-processing
GOOGLE_API_KEY=<api-key>
CHROMA_DB_PATH=./chroma_data
CHUNK_SIZE=500
CHUNK_OVERLAP=50
```

### Frontend — `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=https://edurag-api.azurewebsites.net
```

> Copiar `.env.example` en cada módulo antes de desarrollar. **Nunca commitear archivos `.env` con credenciales reales.**

---

## Despliegue

### Backend — App Service `edurag-api`

**Manual (ZIP deploy):**
```bash
cd backend
zip -r ../backend-deploy.zip . \
  --exclude "*.pyc" \
  --exclude "__pycache__/*" \
  --exclude "chroma_data/*" \
  --exclude ".env"

az webapp deploy \
  --name edurag-api \
  --resource-group EduBot-app \
  --src-path ../backend-deploy.zip \
  --type zip
```

**Startup command (configurar en App Service → Configuration → General settings):**
```
bash startup.sh
```

`startup.sh` ejecuta:
```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend — Static Web Apps `edurag-frontend`

Despliegue automático via GitHub Actions. No se requiere acción manual.

URL de producción: `https://delightful-sea-04066b61e.7.azurestaticapps.net`

### Worker — ejecución local / App Service

```bash
cd worker
pip install -r requirements.txt
python queue_worker.py
```

En producción se recomienda ejecutar el worker como un **WebJob** dentro del mismo App Service, o como un proceso separado en una VM/Container de bajo costo.

---

## CI/CD

Los workflows en `.github/workflows/` se disparan automáticamente con cada push a `main`.

| Workflow | Archivo | Destino |
|---|---|---|
| Backend | `backend.yml` | Azure App Service `edurag-api` |
| Frontend | `frontend.yml` | Azure Static Web Apps `edurag-frontend` |

### Secrets requeridos en GitHub Actions

| Secret | Descripción |
|---|---|
| `AZURE_CLIENT_ID` | App Registration en Microsoft Entra ID |
| `AZURE_TENANT_ID` | Tenant ID de Azure |
| `AZURE_SUBSCRIPTION_ID` | ID de suscripción de Azure |
| `AZURE_STATIC_WEB_APPS_TOKEN` | Token de deployment de Static Web Apps |

---

## Roles y Permisos

| Rol | Método de creación | Permisos |
|---|---|---|
| `admin` | Creado manualmente en Cosmos DB | Crear/listar docentes, gestionar la plataforma |
| `teacher` | Admin vía `POST /admin/teachers` | Crear/editar/eliminar chatbots propios, subir documentos |
| `student` | Auto-registro vía `POST /auth/register` | Chatear con chatbots publicados, ver marketplace |

El campo `role` en el JWT controla el acceso. Los docentes son siempre creados por el administrador (`auth_method: pre_created`); los estudiantes se registran de forma autónoma.

---

## Seguridad

| Control | Implementación | Archivo |
|---|---|---|
| Aislamiento multi-tenant | Todas las queries a ChromaDB filtran por `chatbot_id`; validado contra el JWT del owner | `vector_store.py`, `main.py` |
| Validación de archivos | MIME type verificado en backend (no solo extensión); límite de 20 MB | `main.py` |
| Rate limiting | `slowapi` — 100 req/min por IP en endpoint de chat | `main.py` |
| CORS | Lista explícita de orígenes en producción | `settings.py` (`CORS_ORIGINS`) |
| Contraseñas | bcrypt con factor de costo por defecto | `password.py` |
| Secretos | Variables de entorno; nunca en código | `.env` / GitHub Secrets |

> **Prioridad para producción:** el endpoint `/chat/{chatbot_id}` debe implementar rate limiting también por `chatbot_id` (no solo por IP) para proteger contra abuso de un chatbot específico.

---

## Estado del Proyecto

### Recursos Azure activos (grupo `EduBot-app`)

| Recurso | Tipo | Región | Estado |
|---|---|---|---|
| `edu-bot-cosmos` | Cosmos DB for NoSQL | West US 2 | ✅ Activo |
| `edubotstore2026` | Storage Account (Blob + Queue) | West US 2 | ✅ Activo |
| `edurag-api` | App Service Linux — Basic B1 | Central US | ✅ Activo |
| `edurag-frontend` | Static Web App | West US 2 | ✅ Activo |
| `edurag-backend` | Container App | West US 2 | ❌ Failed — eliminar |

> El Container App `edurag-backend` tiene estado `Failed` y no está en uso. Se recomienda eliminarlo para evitar consumo de crédito.

### Progreso de Fases

| Fase | Descripción | Estado |
|---|---|---|
| 0 | Setup e infraestructura — monorepo, Azure, CI/CD | ✅ Completada |
| 1 | Autenticación JWT, gestión de usuarios, admin básico | ✅ Completada |
| 2 | Motor RAG, procesamiento de documentos, endpoint de chat | 🔄 En progreso |
| 3 | Dashboard del docente — formulario multi-paso, estado en tiempo real | ⏳ Pendiente |
| 4 | Portal del estudiante, marketplace público, iframe embebible | ⏳ Pendiente |
| 5 | Hardening, Application Insights, alertas de presupuesto, runbook | ⏳ Pendiente |

---

## Extensibilidad LLM

La clase `LLMClient` en `backend/llm_client.py` abstrae completamente el proveedor de IA. El proveedor se configura por chatbot con el campo `llm_provider` en Cosmos DB (`"gemini"` o `"claude"`).

```python
# Uso en main.py
llm = get_llm_client(chatbot.get("llm_provider", "gemini"))
response = llm.generate(system_prompt, context, user_message, temperature)
```

**Para agregar soporte a Claude (Fase 2):**

1. Implementar `_generate_claude()` en `llm_client.py` usando el SDK de Anthropic.
2. Agregar `ANTHROPIC_API_KEY` a las variables de entorno.
3. El resto del sistema no requiere cambios — la abstracción ya está en su lugar.

---

## Autores

| Autor | GitHub |
|---|---|
| Oscar Bolívar | [@oscarbol09](https://github.com/oscarbol09) |
| Darío Oviedo | [@dariooviedo2022](https://github.com/dariooviedo2022) |

---

*Para la especificación técnica completa, ver [SPEC.md](./SPEC.md). Para instrucciones específicas por módulo, ver los archivos `AGENTS.md` dentro de cada carpeta.*
