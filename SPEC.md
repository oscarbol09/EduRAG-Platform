# EduRAG - Plataforma SaaS Educativa con RAG

## 1. Concepto & Visión

EduRAG es una plataforma multi-tenant donde los docentes crean agentes conversacionales basados en sus propios documentos, y los estudiantes los consumen a través de un marketplace centralizado o mediante integración con LMS externos (Moodle). El sistema prioriza costo mínimo ($0/mes post-primer-mes), arquitectura extensible para múltiples LLMs, y experiencias diferenciadas por perfil.

## 2. Arquitectura del Sistema

### Stack Tecnológico

| Componente | Servicio Azure | Tier |
|------------|----------------|------|
| Frontend SPA | Azure Static Web Apps | Free |
| API Backend | Azure App Service (Linux) | Free (F1) |
| Base de datos principal | Azure Cosmos DB for NoSQL | Free Tier permanente |
| Almacenamiento documentos | Azure Blob Storage | Free (5 GB) |
| Cola procesamiento asíncrono | Azure Queue Storage | Free |
| Autenticación social | Microsoft Entra ID | Free |
| Base de datos vectorial | ChromaDB (local) | Gratis |

### Estructura del Proyecto

```
/
├── frontend/          # Next.js 14 SPA
├── backend/           # FastAPI REST API
├── worker/            # Procesamiento asíncrono (cola)
└── SPEC.md
```

## 3. Modelo de Datos (Cosmos DB)

### Colección: users
```json
{
  "id": "string",
  "email": "string",
  "role": "teacher" | "student" | "admin",
  "auth_method": "pre_created" | "email_password" | "google" | "microsoft",
  "institution": "string",
  "country": "string",
  "created_at": "ISO8601",
  "is_active": boolean
}
```

### Colección: chatbots
```json
{
  "id": "string",
  "owner_id": "string (user.id)",
  "name": "string",
  "subject_area": "string",
  "education_level": "secondary" | "university",
  "tone": "formal" | "friendly" | "technical",
  "welcome_message": "string",
  "system_prompt_override": "string",
  "restriction_level": "strict" | "guided" | "open",
  "llm_provider": "gemini" | "claude",
  "public_url": "string",
  "embed_code": "string",
  "is_published": boolean,
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### Colección: documents
```json
{
  "id": "string",
  "chatbot_id": "string",
  "blob_url": "string",
  "filename": "string",
  "mime_type": "string",
  "status": "queued" | "processing" | "indexed" | "error",
  "chunk_count": number,
  "error_message": "string",
  "created_at": "ISO8601",
  "processed_at": "ISO8601"
}
```

### Colección: conversations
```json
{
  "id": "string",
  "chatbot_id": "string",
  "student_id": "string | null",
  "messages": [
    { "role": "user" | "assistant", "content": "string", "timestamp": "ISO8601" }
  ],
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

## 4. API Endpoints

### Autenticación
- `POST /auth/login` - Login con email/password
- `POST /auth/register` - Registro de estudiantes
- `POST /auth/callback/{provider}` - OAuth callback (Google/Microsoft)
- `GET /auth/me` - Usuario actual

### Chatbots
- `GET /chatbots` - Listar chatbots del docente
- `POST /chatbots` - Crear chatbot
- `GET /chatbots/{id}` - Obtener chatbot
- `PUT /chatbots/{id}` - Actualizar chatbot
- `DELETE /chatbots/{id}` - Eliminar chatbot
- `POST /chatbots/{id}/publish` - Publicar chatbot
- `GET /chatbots/{id}/embed` - Obtener código embed

### Documentos
- `POST /documents/upload` - Subir documento
- `GET /documents/{id}` - Estado del documento
- `GET /documents` - Listar documentos de un chatbot
- `DELETE /documents/{id}` - Eliminar documento

### Chat
- `POST /chat/{chatbot_id}` - Enviar mensaje
- `GET /chat/{chatbot_id}/history` - Historial de conversación

### Admin
- `POST /admin/teachers` - Crear cuenta de docente
- `GET /admin/teachers` - Listar docentes

### Sistema
- `GET /health` - Health check (keep-alive)
- `GET /ready` - Readiness check

## 5. Estrategia RAG

### Fase de Ingesta (Asíncrona)
1. Docente sube archivo → API guarda en Blob Storage → publica en Queue
2. Worker procesa mensaje de cola:
   - Extracción de texto (PyMuPDF para PDFs, python-docx para Word)
   - Chunking (500 tokens, 50 overlap) con RecursiveCharacterTextSplitter
   - Generación de embeddings con text-embedding-004 (Google)
   - Almacenamiento en ChromaDB (colección = chatbot_id)

### Fase de Consulta (Síncrona)
1. Estudiante envía mensaje
2. Generar embedding de la pregunta
3. Búsqueda de similitud en ChromaDB (top 3-5 fragmentos)
4. Construir prompt con contexto + system prompt + pregunta
5. Llamada a Gemini (gemini-1.5-flash)

### Niveles de Restricción
| Nivel | Temperature | Comportamiento |
|-------|-------------|-----------------|
| strict | 0.2 | Respuestas cortas, solo contexto |
| guided | 0.5 | Respuestas balanceadas |
| open | 0.8 | Respuestas creativas |

## 6. Seguridad

### Controles Implementados
1. **Aislamiento multi-tenant**: Filtro obligatorio por chatbot_id en todas las consultas RAG
2. **Validación de archivos**: MIME types permitidos (application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document), límite 20MB
3. **Rate limiting**: slowapi en endpoints de chat (100 req/min por IP)
4. **CORS**: Política explícita por ruta

### Rate Limits
- Chat endpoint: 100 req/min por IP, 50 req/min por chatbot_id
- Upload: 10 req/min por usuario

## 7. Plan de Ejecución por Fases

### Fase 0 — Setup e Infraestructura (Semana 1)
- [x] Estructura monorepo
- [x] Aprovisionar Azure resources
- [x] Configurar GitHub Actions CI/CD
- [x] Variables de entorno y secretos

### Fase 1 — Autenticación y Gestión de Usuarios (Semana 2)
- [x] Microsoft Entra ID setup
- [x] Endpoints de auth (mock con fallback)
- [ ] Panel admin para docentes

### Fase 2 — Motor RAG y Procesamiento de Documentos (Semanas 3-4)
- [ ] Worker asíncrono
- [ ] Pipeline de extracción/chunking/embedding
- [ ] Endpoint de chat RAG

### Fase 3 — Dashboard del Docente (Semana 5)
- [ ] Formulario de creación multi-paso
- [ ] Estado de procesamiento en tiempo real
- [ ] Marketplace interno

### Fase 4 — Portal del Estudiante y Chatbot Embebible (Semana 6)
- [ ] Marketplace público con búsqueda
- [ ] Interfaz de chat con SSE streaming
- [ ] Validación de embed en iframe

### Fase 5 — Hardening, Monitoreo y Lanzamiento (Semana 7)
- [ ] Application Insights
- [ ] Alertas de presupuesto
- [ ] Runbook operativo

## 8. Configuración por Defecto

### Temperatures por nivel
```python
RESTRICTION_TEMPERATURES = {
    "strict": 0.2,
    "guided": 0.5,
    "open": 0.8
}
```

### Chunking
```python
CHUNK_SIZE = 500  # tokens
CHUNK_OVERLAP = 50  # tokens
RETRIEVAL_TOP_K = 5  # fragmentos
```

### Límites
```python
MAX_FILE_SIZE_MB = 20
MAX_CACHE_SIZE = 1000  # preguntas frecuentes
TTL_CONVERSATIONS_DAYS = 90
```
