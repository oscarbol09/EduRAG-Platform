# EduRAG Platform

Plataforma SaaS educativa con chatbots impulsados por RAG (Retrieval-Augmented Generation). Permite a docentes crear agentes conversacionales basados en sus propios documentos, y a estudiantes acceder a tutoring inteligente.

## Stack Tecnológico

| Componente | Servicio Azure | Tier |
|------------|----------------|------|
| Frontend SPA | Next.js 16 + Vite | - |
| API Backend | FastAPI + Python 3.11 | App Service (B1) |
| Base de datos principal | Azure Cosmos DB for NoSQL | Free Tier |
| Almacenamiento documentos | Azure Blob Storage | Free (5 GB) |
| Cola procesamiento | Azure Queue Storage | Free |
| Autenticación | Microsoft Entra ID | Free |
| LLM | Google Gemini 2.0 Flash | Pay-per-use |

## Estructura del Proyecto

```
/
├── backend/            # FastAPI REST API
│   ├── main.py        # Endpoints y configuración
│   ├── azure_cosmos_db.py
│   ├── vector_store.py
│   ├── llm_client.py
│   ├── document_uploader.py
│   └── requirements.txt
├── frontend/          # Next.js 16 SPA
│   ├── src/
│   │   ├── app/       # Páginas (login, teacher, marketplace, chat)
│   │   ├── lib/       # API client y utilidades
│   │   └── components/
│   └── package.json
├── worker/           # Procesamiento asíncrono de documentos
├── .github/
│   └── workflows/    # CI/CD con GitHub Actions
└── SPEC.md           # Especificación técnica
```

## Modelo de Datos

**Colecciones en Cosmos DB:**

- `users` - Docentes, estudiantes y admins
- `chatbots` - Configuración de chatbots por docente
- `documents` - Metadatos de documentos subidos
- `conversations` - Historial de conversaciones

## API Endpoints

### Autenticación
- `POST /auth/login` - Login
- `POST /auth/register` - Registro de estudiantes
- `GET /auth/me` - Usuario actual

### Chatbots
- `GET /chatbots` - Listar chatbots
- `POST /chatbots` - Crear chatbot
- `GET/PUT/DELETE /chatbots/{id}` - CRUD
- `POST /chatbots/{id}/publish` - Publicar

### Documentos
- `POST /documents/upload` - Subir PDF/DOCX
- `GET /documents` - Listar documentos de un chatbot

### Chat
- `POST /chat/{chatbot_id}` - Enviar mensaje (con RAG)
- `GET /chat/{chatbot_id}/history` - Historial

## Despliegue

### Backend (Azure App Service)
```bash
az webapp deploy --name Darius-AI --resource-group Darius_Ai --src-path backend.zip
```

### Frontend (Azure Static Web Apps)
- URL: https://delightful-sea-04066b61e.7.azurestaticapps.net
- Configurar secrets en GitHub:
  - `AZURE_CLIENT_ID`
  - `AZURE_TENANT_ID`
  - `AZURE_SUBSCRIPTION_ID`
  - `AZURE_STATIC_WEB_APPS_TOKEN`

## Variables de Entorno

### Backend
```
COSMOS_DB_ENDPOINT=https://edu-bot-cosmos.documents.azure.com:443/
COSMOS_DB_KEY=<key>
COSMOS_DB_DATABASE=edubot
GOOGLE_API_KEY=<gemini-key>
ENTRA_TENANT_ID=<tenant-id>
ENTRA_CLIENT_ID=<client-id>
```

### Frontend
```
NEXT_PUBLIC_API_URL=<backend-url>
```

## Roles de Usuario

| Rol | Permisos |
|-----|----------|
| teacher | Crear/editar chatbots, subir documentos |
| student | Chatear con chatbots publicados |
| admin | Gestionar docentes |

## Levels de Restricción RAG

| Nivel | Temperature | Comportamiento |
|-------|-------------|-----------------|
| strict | 0.2 | Solo contexto del documento |
| guided | 0.5 | Balanceado |
| open | 0.8 | Creativo pero basado endocs |

## Autores

- Oscar Bolívar - oscarbol09