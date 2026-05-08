# Backend Agent Guidelines

## Proyecto
EduRAG - Backend FastAPI para plataforma SaaS educativa con chatbots RAG.

## Estructura del Código

```
backend/
├── main.py              # FastAPI app, endpoints, middleware
├── settings.py          # Pydantic Settings (environment variables)
├── models.py            # Pydantic models (ChatbotCreate, ChatMessage, etc.)
├── auth.py              # Integración Microsoft Entra ID / MSAL
├── azure_cosmos_db.py   # Cliente Cosmos DB
├── vector_store.py      # ChromaDB para embeddings
├── llm_client.py        # Cliente Google Gemini
├── document_uploader.py # Azure Blob Storage + Queue
└── requirements.txt     # Dependencias Python
```

## Patrones de Código

### Endpoints
```python
@app.get("/chatbots")
async def get_chatbots(owner_id: Optional[str] = None):
    chatbots = await list_chatbots(owner_id=owner_id)
    return chatbots
```

### Cosmos DB
- Usar `partition_key` en consultas
- Funciones async: `create_`, `get_`, `list_`, `update_`, `delete_`
- Colecciones: users (/id), chatbots (/owner_id), documents (/chatbot_id), conversations (/chatbot_id)

### RAG Pipeline
1. `/documents/upload` → Blob Storage → Queue
2. Worker: extrae texto → chunking → embeddings → ChromaDB
3. `/chat/{id}` → busca similar → construye prompt → Gemini

## Variables de Entorno Requeridas

```env
COSMOS_DB_ENDPOINT=https://edu-bot-cosmos.documents.azure.com:443/
COSMOS_DB_KEY=<key>
COSMOS_DB_DATABASE=edubot
GOOGLE_API_KEY=<gemini-key>
ENTRA_TENANT_ID=86f9e58e-33c2-4d36-b633-a65f2b3d012e
ENTRA_CLIENT_ID=49c05b62-a23c-4df0-8ee9-98162a1ac994
AZURE_STORAGE_CONNECTION_STRING=<connection-string>
AZURE_QUEUE_CONNECTION_STRING=<connection-string>
AZURE_QUEUE_NAME=processing-queue
CHROMA_DB_PATH=./chroma_data
```

## Azure Resources

| Recurso | Ubicación |
|---------|-----------|
| Cosmos DB | edu-bot-cosmos.documents.azure.com |
| Storage | edubotstore2026.blob.core.windows.net |
| Queue | processing-queue |
| App Service | Darius-AI (brazilsouth) |

## Testing Local

```bash
cd backend
pip install -r requirements.txt
python test_api.py
```

## Deployment

- GitHub Actions en `.github/workflows/backend.yml`
- Azure App Service: `Darius-AI`
- Startup: `python3 -m uvicorn main:app --host 0.0.0.0 --port 8000`

## Notas Importantes

- Auth actual: mock (fallback a demo-user)
- Para auth real: configurar MSAL con Entra ID
- Gemini usa modelo `gemini-2.0-flash`
- Temperatures RAG: strict=0.2, guided=0.5, open=0.8