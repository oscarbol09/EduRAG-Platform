# Frontend Agent Guidelines

## Proyecto
EduRAG - Frontend Next.js 16 para plataforma SaaS educativa.

## Estructura del Proyecto

```
frontend/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── page.tsx      # Home (marketplace)
│   │   ├── login/        # Login page
│   │   ├── teacher/      # Dashboard del docente
│   │   │   ├── page.tsx  # Lista de chatbots
│   │   │   └── chatbots/
│   │   │       └── new/  # Crear chatbot
│   │   ├── marketplace/  # Marketplace público
│   │   └── chat/
│   │       └── [botId]/  # Chat interface
│   ├── lib/
│   │   ├── api.ts        # Cliente API (fetch wrappers)
│   │   ├── types.ts      # TypeScript types
│   │   ├── context.tsx   # Auth context
│   │   └── utils.ts      # Utilidades
│   └── components/       # Componentes reutilizables
├── package.json
└── .env.local
```

## API Client

El cliente API está en `src/lib/api.ts` y usa `NEXT_PUBLIC_API_URL`.

```typescript
// Ejemplo de uso
const chatbots = await api.chatbots.list();
const response = await api.chat.send(botId, { message: "texto" });
```

## Variables de Entorno

```env
NEXT_PUBLIC_API_URL=https://darius-ai-aqfkhna3evdqdte3.brazilsouth-01.azurewebsites.net
```

## Páginas Principales

| Ruta | Descripción |
|------|-------------|
| `/` | Home con marketplace de chatbots |
| `/login` | Login de usuarios |
| `/teacher` | Dashboard del docente |
| `/teacher/chatbots/new` | Formulario de creación |
| `/marketplace` | Lista pública de chatbots |
| `/chat/[botId]` | Interfaz de chat con un chatbot |

## Tipos Principales

```typescript
interface Chatbot {
  id: string;
  name: string;
  subject_area: string;
  education_level: "secondary" | "university";
  tone: "formal" | "friendly" | "technical";
  restriction_level: "strict" | "guided" | "open";
  is_published: boolean;
}

interface ChatMessage {
  message: string;
  conversation_id?: string;
}
```

## Deployment

- Azure Static Web Apps: `edurag-frontend`
- URL: https://delightful-sea-04066b61e.7.azurestaticapps.net
- CI/CD: `.github/workflows/frontend.yml`
- Build: `npm run build`
- Output: `.next/` (static export)

## Notas Técnicas

- Next.js 16 con App Router
- Tailwind CSS para estilos
- Radix UI para componentes accesibles
- Estado de auth en localStorage (`token`)
- API fallback a demo-user si no hay token