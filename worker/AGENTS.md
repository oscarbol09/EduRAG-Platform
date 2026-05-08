# Worker Agent Guidelines

## Proyecto
EduRAG - Worker para procesamiento asíncrono de documentos con RAG.

## Funcionalidad

El worker procesa documentos de la cola de Azure Queue:
1. Lee mensaje de `processing-queue`
2. Descarga archivo de Blob Storage
3. Extrae texto (PDF con PyMuPDF, DOCX con python-docx)
4. Chunking con RecursiveCharacterTextSplitter
5. Genera embeddings con Gemini
6. Almacena en ChromaDB (colección = chatbot_id)
7. Actualiza estado en Cosmos DB

## Estructura

```
worker/
├── document_processor.py  # Pipeline RAG
├── queue_worker.py        # Procesador de cola
├── requirements.txt
└── .env
```

## Variables de Entorno

```env
COSMOS_DB_ENDPOINT=https://edu-bot-cosmos.documents.azure.com:443/
COSMOS_DB_KEY=<key>
COSMOS_DB_DATABASE=edubot
AZURE_STORAGE_CONNECTION_STRING=<connection-string>
AZURE_QUEUE_CONNECTION_STRING=<connection-string>
AZURE_QUEUE_NAME=processing-queue
GOOGLE_API_KEY=<gemini-key>
CHROMA_DB_PATH=./chroma_data
CHUNK_SIZE=500
CHUNK_OVERLAP=50
```

## Mensaje de Cola

```json
{
  "document_id": "uuid",
  "chatbot_id": "uuid",
  "blob_url": "https://...",
  "filename": "doc.pdf",
  "mime_type": "application/pdf"
}
```

## Estados del Documento

- `queued` - Subido, esperando procesamiento
- `processing` - Worker lo está procesando
- `indexed` - Embeddings almacenados
- `error` - Falló el procesamiento

## Ejecución Local

```bash
cd worker
pip install -r requirements.txt
python queue_worker.py
```