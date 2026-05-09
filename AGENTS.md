# EduRAG — AGENTS.md (Raíz del Proyecto)

Guía de referencia rápida para agentes de IA y colaboradores que trabajen en cualquier parte del repositorio. Para detalle de cada módulo, ver el `AGENTS.md` correspondiente en `backend/`, `frontend/` y `worker/`.

---

## Contexto del Proyecto

**EduRAG** es una plataforma SaaS educativa multi-tenant. Los docentes crean chatbots RAG a partir de sus propios documentos (PDF, DOCX). Los estudiantes los consumen vía marketplace web o iframe embebido en LMS externos (Moodle).

**Tres restricciones de diseño no negociables:**
1. Costo operativo $0/mes post-primer-mes (Azure Free Tiers + APIs gratuitas).
2. Aislamiento estricto de datos por tenant (por `chatbot_id` y `owner_id`).
3. Arquitectura extensible para múltiples LLMs sin cambios de lógica de negocio.

---

## Stack de Referencia Rápida

| Capa | Tecnología | Dónde |
|---|---|---|
| Frontend | Next.js 16 + Tailwind CSS + Radix UI | `frontend/` |
| Backend | FastAPI (Python 3.11) + Uvicorn | `backend/` |
| Worker asíncrono | Python puro + azure-storage-queue | `worker/` |
| Base de datos | Azure Cosmos DB for NoSQL — DB: `edubot` | Cloud |
| Almacenamiento | Azure Blob Storage — `edubotstore2026` | Cloud |
| Cola | Azure Queue Storage — `document-processing` | Cloud |
| Autenticación | JWT propio HS256 (PyJWT + bcrypt) | `backend/jwt_token.py`, `auth.py` |
| LLM activo | Google Gemini 2.0 Flash | `backend/llm_client.py` |
| LLM stub | Anthropic Claude (no implementado aún) | `backend/llm_client.py` |
| Vector store | ChromaDB (local en App Service) | `backend/vector_store.py` |
| Embeddings | Google text-embedding-004 | `backend/main.py`, `worker/document_processor.py` |

---

## Recursos Azure

| Recurso | Tipo | Región | Resource Group | Estado |
|---|---|---|---|---|
| `edu-bot-cosmos` | Cosmos DB for NoSQL | West US 2 | EduBot-app | ✅ Activo |
| `edubotstore2026` | Storage Account | West US 2 | EduBot-app | ✅ Activo |
| `edurag-api` | App Service Linux B1 | Central US | EduBot-app | ✅ Activo |
| `edurag-frontend` | Static Web App | West US 2 | EduBot-app | ✅ Activo |
| `edurag-backend` | Container App | West US 2 | EduBot-app | ❌ Failed — eliminar |

**URLs de producción:**
- API: `https://edurag-api.azurewebsites.net`
- Frontend: `https://delightful-sea-04066b61e.7.azurestaticapps.net`

---

## Colecciones Cosmos DB

| Colección | Partition Key | Descripción |
|---|---|---|
| `users` | `/id` | Docentes, estudiantes y admins |
| `chatbots` | `/owner_id` | Configuración de cada chatbot |
| `documents` | `/chatbot_id` | Metadatos de documentos subidos |
| `conversations` | `/chatbot_id` | Historial de mensajes (TTL: 90 días) |

**Regla crítica:** toda query a ChromaDB debe filtrar por `chatbot_id`. Nunca exponer vectores de un tenant a consultas de otro.

---

## Autenticación — Resumen

> Azure AD B2C fue descontinuado por Microsoft. El sistema usa **JWT propio** (HS256).

- Login: `POST /auth/login` → verifica bcrypt → emite JWT con `{ sub, email, role, exp }`.
- Registro de estudiantes: `POST /auth/register` (auto-servicio).
- Creación de docentes: `POST /admin/teachers` (solo admin).
- Validación de endpoints: `get_current_user(request)` en `backend/auth.py`.
- Microsoft Entra ID está configurado como referencia de tenant para login social futuro, pero los flujos OAuth no están activos en el MVP.

---

## Pipeline RAG — Flujo Resumido

```
Ingesta (asíncrona):
  Upload → Blob Storage → Queue → Worker:
    descarga → extrae texto → chunking (500/50) → embeddings → ChromaDB → Cosmos DB: indexed

Consulta (síncrona):
  Mensaje → embedding pregunta → ChromaDB top-5 → prompt build → Gemini 2.0 Flash → respuesta
```

**Temperatures por restriction_level:**

| Nivel | Temperature |
|---|---|
| `strict` | `0.2` |
| `guided` | `0.5` |
| `open` | `0.8` |

---

## Roles

| Rol | Creación | Permisos clave |
|---|---|---|
| `admin` | Manual en Cosmos DB | Crear docentes, administrar plataforma |
| `teacher` | Admin vía `POST /admin/teachers` | CRUD de sus chatbots, subir documentos |
| `student` | Auto-registro `POST /auth/register` | Chat con publicados, ver marketplace |

---

## API Endpoints — Referencia Rápida

```
# Sistema
GET  /health                        → keep-alive / health check
GET  /ready                         → readiness (verifica ChromaDB)

# Auth
POST /auth/login                    → { token, user }
POST /auth/register                 → { token, user }
GET  /auth/me                       → datos del usuario actual

# Chatbots
GET  /chatbots                      → lista (filtros: owner_id, published_only)
POST /chatbots                      → crear [JWT]
GET  /chatbots/{id}                 → detalle
PUT  /chatbots/{id}                 → actualizar [JWT owner]
DELETE /chatbots/{id}               → eliminar + vectores [JWT owner]
POST /chatbots/{id}/publish         → publicar [JWT owner]
GET  /chatbots/{id}/embed           → embed_code + public_url

# Documentos
POST /documents/upload              → subir PDF/DOCX (multipart)
GET  /documents?chatbot_id=         → listar
GET  /documents/{id}                → estado de procesamiento
DELETE /documents/{id}              → eliminar

# Chat
POST /chat/{chatbot_id}             → RAG completo (100 req/min/IP)
GET  /chat/{chatbot_id}/history     → historial

# Admin
POST /admin/teachers                → crear docente
GET  /admin/teachers                → listar docentes
```

---

## Convenciones de Código y Git

### Commits (Conventional Commits)
```
feat:     nueva funcionalidad
fix:      corrección de bug
docs:     solo documentación
refactor: refactoring sin cambio de comportamiento
test:     tests
chore:    tareas de mantenimiento (deps, CI, etc.)
```

### Branches
```
main          → producción (despliegue automático)
develop       → integración
feature/nombre-descriptivo
fix/nombre-descriptivo
```

### Reglas
- Nunca commitear archivos `.env` ni credenciales.
- Nunca hardcodear API keys, connection strings ni secrets en código.
- Todo PR hacia `main` debe pasar los checks de CI.

---

## Testing

```bash
# Backend — test de endpoints
cd backend
python test_api.py

# Frontend — build de producción
cd frontend
npm run build

# Worker — ejecución en modo demo (sin queue real)
cd worker
python queue_worker.py   # detecta AZURE_QUEUE_CONNECTION_STRING vacío → demo mode
```

---

## Despliegue Rápido

```bash
# Backend (ZIP deploy manual)
cd backend
zip -r ../backend-deploy.zip . --exclude "*.pyc" --exclude "__pycache__/*" \
  --exclude "chroma_data/*" --exclude ".env"
az webapp deploy --name edurag-api --resource-group EduBot-app \
  --src-path ../backend-deploy.zip --type zip

# Frontend → automático via GitHub Actions en push a main
```

---

## Variables de Entorno Críticas

| Variable | Módulo | Descripción |
|---|---|---|
| `COSMOS_DB_ENDPOINT` | backend, worker | URL de Cosmos DB |
| `COSMOS_DB_KEY` | backend, worker | Primary key de Cosmos DB |
| `GOOGLE_API_KEY` | backend, worker | API key de Google AI (Gemini + embeddings) |
| `JWT_SECRET` | backend | Secret para firmar tokens JWT (≥32 chars) |
| `AZURE_STORAGE_CONNECTION_STRING` | backend, worker | Connection string de Storage Account |
| `AZURE_QUEUE_CONNECTION_STRING` | backend, worker | Connection string para Queue Storage |
| `NEXT_PUBLIC_API_URL` | frontend | URL base de la API backend |

---

## Checklist para Nuevas Features

- [ ] ¿Afecta multi-tenant? → verificar aislamiento por `chatbot_id` / `owner_id`.
- [ ] ¿Nuevo endpoint? → documentar en la tabla de API Reference del README.
- [ ] ¿Nueva variable de entorno? → agregar a `.env.example` del módulo correspondiente.
- [ ] ¿Nuevo modelo de datos? → actualizar la sección de Modelo de Datos en README.
- [ ] ¿Cambio en costos de Azure? → re-evaluar si sigue dentro del Free Tier.
- [ ] ¿Cambio en LLM? → hacerlo solo en `llm_client.py` respetando la interfaz `generate()`.
