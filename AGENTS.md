# EduRAG Platform - Agente Guidelines

## Visión del Proyecto
Plataforma SaaS educativa multi-tenant donde docentes crean chatbots basados en RAG (Retrieval-Augmented Generation) usando sus propios documentos. Estudiantes acceden via marketplace o embeds.

## Restricciones
- Costo cero post-primer mes (Azure Free Tiers)
- Multi-tenant con aislamiento de datos
- Extensible para múltiples LLMs (Gemini → Claude)

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16 + Tailwind CSS + Radix UI |
| Backend | FastAPI (Python 3.11) + Uvicorn |
| Base de datos | Azure Cosmos DB (NoSQL) |
| Almacenamiento | Azure Blob Storage |
| Cola | Azure Queue Storage |
| Auth | Microsoft Entra ID |
| LLM | Google Gemini 2.0 Flash |
| Vectores | ChromaDB (local) |

## Estructura del Proyecto

```
/
├── backend/           # FastAPI REST API
├── frontend/          # Next.js SPA
├── worker/           # Procesamiento asíncrono
├── .github/
│   └── workflows/    # CI/CD
├── SPEC.md           # Especificación técnica
└── README.md        # Documentación general
```

## Recursos Azure

| Servicio | Resource Group | Notas |
|----------|----------------|-------|
| Cosmos DB `edu-bot-cosmos` | EduBot-app | Database: edubot |
| Storage `edubotstore2026` | EduBot-app | Container: documents, Queue: processing-queue |
| App Service `Darius-AI` | Darius_Ai | Python 3.11, Brazil South |
| Static Web App `edurag-frontend` | EduBot-app | West US 2 |

## Colecciones Cosmos DB

| Colección | Partition Key | Uso |
|-----------|---------------|-----|
| users | /id | Docentes, estudiantes |
| chatbots | /owner_id | Config de chatbots |
| documents | /chatbot_id | Metadatos docs |
| conversations | /chatbot_id | Historial chat |

## Roles de Usuario

| Rol | Descripción |
|-----|-------------|
| teacher | Crea chatbots, sube documentos, ve analytics |
| student | Chatea con publicados, ve marketplace |
| admin | Gestiona docentes, configura sistema |

## Levels de Restricción RAG

| Nivel | Temperatura | Descripción |
|-------|-------------|-------------|
| strict | 0.2 | Solo contexto del documento |
| guided | 0.5 | Balanceado |
| open | 0.8 | Creativo, basado en docs |

## API Endpoints Principales

```
POST /auth/login           → Login
GET  /auth/me              → Usuario actual
GET  /chatbots              → Listar chatbots
POST /chatbots             → Crear chatbot
POST /documents/upload      → Subir documento
POST /chat/{id}             → Chat con RAG
POST /chatbots/{id}/publish → Publicar chatbot
```

## Secrets Requeridos

### GitHub Actions
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_STATIC_WEB_APPS_TOKEN`

### Backend Environment
- `COSMOS_DB_ENDPOINT`
- `COSMOS_DB_KEY`
- `GOOGLE_API_KEY`
- `ENTRA_TENANT_ID`
- `ENTRA_CLIENT_ID`

## Git Workflow

- Commits convencionales: `feat:`, `fix:`, `docs:`, `refactor:`
- Branches: `feature/nombre`, `fix/nombre`
- Nunca commitear `.env` o secrets

## Testing

```bash
# Backend
cd backend && python test_api.py

# Frontend
cd frontend && npm run build
```

## Deployment

- Backend: Azure App Service → `Darius-AI`
- Frontend: Azure Static Web Apps → `edurag-frontend`
- Automático via GitHub Actions en push a main