# EduRAG Worker — AGENTS.md

Guía técnica para agentes de IA y desarrolladores que trabajen en el módulo `worker/`. Este módulo es responsable del procesamiento asíncrono de documentos: extrae texto, genera embeddings e indexa en ChromaDB.

---

## Propósito del Módulo

El worker escucha la cola **Azure Queue Storage** (`document-processing`) y procesa cada mensaje ejecutando el pipeline RAG de ingesta completo. Está **desacoplado del backend** — tiene sus propios clientes de Cosmos DB y ChromaDB, y sus propias variables de entorno.

Esto garantiza que subir un archivo no bloquee la API ni cause timeouts, independientemente del tamaño del documento o del tiempo de procesamiento.

---

## Estructura de Archivos

```
worker/
├── queue_worker.py         # Loop principal — escucha Azure Queue, despacha mensajes
├── document_processor.py   # Pipeline completo de procesamiento de un documento
├── azure_cosmos_db.py      # Cliente Cosmos DB (independiente del backend)
├── vector_store.py         # Cliente ChromaDB (independiente del backend)
├── settings.py             # Variables de entorno del worker (Pydantic Settings)
├── requirements.txt        # Dependencias Python
├── .env                    # Variables de entorno locales (NO commitear)
└── .env.example            # Plantilla de variables de entorno
```

---

## Pipeline de Procesamiento

Cada mensaje en la cola representa un documento listo para indexar. El procesamiento sigue este flujo estrictamente secuencial:

```
Azure Queue: document-processing
        │
        ▼
queue_worker.py — receive_messages(max_messages=1, visibility_timeout=30s)
        │
        ▼
document_processor.process_document()
        │
        ├── 1. Cosmos DB → status: "processing"
        │
        ├── 2. Descarga blob_url desde Azure Blob Storage
        │         BlobServiceClient.from_connection_string()
        │
        ├── 3. Extracción de texto:
        │         PDF  → PyMuPDF (fitz.open stream)
        │         DOCX → python-docx (Document BytesIO)
        │
        ├── 4. Chunking con LangChain RecursiveCharacterTextSplitter
        │         chunk_size=500, chunk_overlap=50
        │         fallback: splitter manual por líneas si LangChain falla
        │
        ├── 5. Generación de embeddings — Google text-embedding-004
        │         task_type="retrieval_document"
        │         un embedding por chunk (llamada secuencial a la API)
        │
        ├── 6. Almacenamiento en ChromaDB
        │         colección: chatbot_{chatbot_id}
        │         vector_store.add_documents(chatbot_id, chunks, embeddings, document_id)
        │
        └── 7. Cosmos DB → status: "indexed", chunk_count: N, processed_at: ISO8601
                  (en caso de error → status: "error", error_message: str)
```

---

## Módulos — Descripción Técnica

### `queue_worker.py`

Clase `QueueWorker` con dos modos de operación:

**Modo normal** (cuando `AZURE_QUEUE_CONNECTION_STRING` está configurado):
- Conecta a Azure Queue Storage.
- Loop `while self.is_running`: `receive_messages(max_messages=1, visibility_timeout=30)`.
- Si el procesamiento es exitoso → `delete_message`.
- Si falla → `update_message(visibility_timeout=300)` (back-off de 5 min).
- Polling cada 1 segundo. En error de cola → sleep 5 segundos.

**Modo demo** (cuando `AZURE_QUEUE_CONNECTION_STRING` está vacío):
- Imprime logs de estado y hace sleep en loop.
- Útil para desarrollo local sin infraestructura Azure.

### `document_processor.py`

Función principal:
```python
async def process_document(
    document_id: str,
    chatbot_id: str,
    blob_url: str,
    filename: str,
    mime_type: str
) -> dict:   # { document_id, chunk_count, status }
```

Funciones auxiliares:
```python
async def extract_text(blob_url, mime_type, filename) -> str
async def extract_text_from_pdf(blob_url) -> str      # usa PyMuPDF
async def extract_text_from_docx(blob_url) -> str     # usa python-docx
def chunk_text(text, chunk_size=500, chunk_overlap=50) -> list[str]
async def generate_embeddings(texts: list[str]) -> list[list[float]]
```

### `settings.py`

```python
settings.CHUNK_SIZE         # 500 (chars)
settings.CHUNK_OVERLAP      # 50 (chars)
settings.AZURE_QUEUE_NAME   # "document-processing"
settings.CHROMA_DB_PATH     # "./chroma_data"
```

---

## Mensaje de Cola — Formato

```json
{
  "document_id": "uuid-v4",
  "chatbot_id": "uuid-v4",
  "blob_url": "https://edubotstore2026.blob.core.windows.net/documents/{chatbot_id}/{doc_id}/{filename}",
  "filename": "apuntes-clase.pdf",
  "mime_type": "application/pdf"
}
```

El backend publica este mensaje en `document_uploader.publish_to_queue()` inmediatamente después de subir el archivo a Blob Storage.

---

## Estados del Documento en Cosmos DB

| Estado | Descripción | Quién lo escribe |
|---|---|---|
| `queued` | Archivo subido, esperando procesamiento | Backend (`/documents/upload`) |
| `processing` | Worker tomó el mensaje y está procesando | Worker (inicio de `process_document`) |
| `indexed` | Embeddings almacenados en ChromaDB | Worker (fin exitoso) |
| `error` | Falló el procesamiento | Worker (en bloque `except`) |

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

# Google AI
GOOGLE_API_KEY=<api-key>

# ChromaDB
CHROMA_DB_PATH=./chroma_data

# RAG
CHUNK_SIZE=500
CHUNK_OVERLAP=50
```

---

## Ejecución Local

```bash
cd worker

# 1. Crear entorno virtual
python -m venv .venv
source .venv/bin/activate   # Linux/Mac
.venv\Scripts\activate      # Windows

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con credenciales reales

# 4. Iniciar worker
python queue_worker.py
```

Si `AZURE_QUEUE_CONNECTION_STRING` está vacío, arranca en **modo demo** (sin procesar mensajes reales).

---

## Despliegue en Producción

El worker no tiene un despliegue propio configurado en CI/CD actualmente. Opciones recomendadas:

**Opción A — WebJob en App Service (recomendado para MVP):**
Ejecutar `queue_worker.py` como un WebJob continuo dentro del mismo App Service `edurag-api`. Requiere empaquetar el worker junto con el backend o como WebJob independiente.

**Opción B — VM o Container separado:**
Desplegar en una VM pequeña (B1s ~$8/mes) o Container Instance si el volumen de documentos crece.

**Opción C — Azure Functions (futuro):**
Migrar a una Azure Function con trigger de Queue Storage para escalado automático.

---

## Notas Importantes

- El worker y el backend **comparten el mismo ChromaDB** solo si corren en la misma máquina o comparten volumen. En producción se debe asegurar que ambos apunten al mismo `CHROMA_DB_PATH` o implementar ChromaDB en modo servidor.
- `generate_embeddings()` llama a la API de Google secuencialmente por chunk. Para documentos grandes (>100 chunks), esto puede ser lento. Considerar batching o llamadas concurrentes con `asyncio.gather` en iteraciones futuras.
- El fallback de `chunk_text()` (splitter manual) se activa si LangChain no está disponible. Verificar que `langchain` esté en `requirements.txt` para evitar degradación silenciosa.
- La visibilidad del mensaje en cola se extiende a 300 segundos en caso de error. Si el error es permanente (documento corrupto), el mensaje quedará en la cola. Implementar una **Dead Letter Queue** o contador de reintentos para producción.
