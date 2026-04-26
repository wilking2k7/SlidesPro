# SlidesPro

> Generador de presentaciones IA editables. Pega un transcript, una URL de YouTube o un PDF y recibe un deck con narrativa, diseño y datos — 100% editable en PowerPoint.

Sucesor SaaS de [`legacy/SlidesIA.html`](./legacy/SlidesIA.html) (single-file POC con pipeline de 4 agentes con Gemini). El plan completo de transformación está en `.claude/plans/`.

---

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** + **Tailwind 4**
- **Postgres** (Railway) + **Prisma**
- **Auth.js v5** — Google + GitHub OAuth + Resend magic links
- **Cloudflare R2** para imágenes generadas y exports
- **Vercel AI SDK** abstrae Gemini / Anthropic / OpenAI
- **PptxGenJS** para PPTX nativo editable
- **BullMQ** + Redis para jobs largos
- Deploy en **Railway** (Docker)

## Quickstart local con Docker (recomendado)

Necesitas Docker Desktop corriendo. Los puertos elegidos no chocan con otros stacks típicos en `5432/5433` ni `5050/5051`.

```bash
# 1. Variables de entorno
cp .env.example .env.local
# .env.local viene listo para Docker — solo añade AUTH_SECRET y un provider OAuth.
# Generar AUTH_SECRET: openssl rand -base64 32

# 2. Levantar Postgres + Redis + pgAdmin
docker compose up -d
# Postgres → localhost:5434
# Redis    → localhost:6380
# pgAdmin  → http://localhost:5052  (admin@slidespro.local / admin)
#            el servidor "SlidesPro Postgres" ya viene preconfigurado

# 3. Instalar dependencias y migrar
npm install
npm run db:migrate
npm run db:seed   # 5 themes preset (Apple, Editorial, CleanTech, Bold, Dark)

# 4. Dev server (en host, hot reload rápido)
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Modo "todo en Docker"

Si prefieres correr también la app en contenedor:

```bash
docker compose --profile full up -d
docker compose logs -f app
```

### Comandos útiles

```bash
docker compose up -d              # levantar servicios
docker compose down               # apagar
docker compose down -v            # apagar y borrar volúmenes (reset DB)
docker compose logs -f postgres   # ver logs
docker compose ps                 # estado
```

### Generar AUTH_SECRET

```bash
openssl rand -base64 32
```

## Servicios externos a provisionar (producción)

| Servicio | Para qué | Variables |
|---|---|---|
| Railway | Hosting (la app corre con el mismo `Dockerfile`) | — |
| Railway Postgres | DB en producción | `DATABASE_URL` |
| Railway Redis | Queue (BullMQ) | `REDIS_URL` |
| Cloudflare R2 | Storage de imágenes/exports | `R2_*` |
| Google Cloud OAuth | Login con Google | `GOOGLE_CLIENT_ID/SECRET` |
| GitHub OAuth | Login con GitHub (opcional) | `GITHUB_CLIENT_ID/SECRET` |
| Resend | Magic links email | `RESEND_API_KEY` |
| Google AI Studio | Gemini (texto + imagen) | `GOOGLE_AI_API_KEY` |
| Anthropic | Claude (refinamiento) | `ANTHROPIC_API_KEY` |
| Sentry | Errores en prod | `SENTRY_DSN` |
| Stripe | Billing (Fase 8) | `STRIPE_*` |

## Archivos Docker

```
Dockerfile              # build prod multi-stage (Railway)
Dockerfile.dev          # dev container con hot reload
docker-compose.yml      # postgres + redis + pgadmin (+ app via profile)
docker/pgadmin/         # servidor preconfigurado
.dockerignore
```

## Estructura

```
src/
├── app/
│   ├── (auth)/login           # login con OAuth/magic link
│   ├── (app)/dashboard        # post-login, lista de presentaciones
│   ├── (app)/editor           # editor visual (Fase 2)
│   └── api/                   # routes (auth, health, generate)
├── components/
│   ├── editor/                # canvas, toolbars, sidebars
│   ├── renderer/              # SlideRenderer (preview compartido)
│   └── ui/                    # primitivos
├── lib/
│   ├── ai/                    # agentes, prompts, providers
│   ├── schema/                # Slide Schema (zod) + themes
│   ├── export/                # pptx/html/pdf
│   ├── ingest/                # pdf/docx/audio/url
│   ├── auth/                  # Auth.js config
│   └── db.ts                  # Prisma singleton
└── server/
    ├── actions/               # Server Actions
    └── jobs/                  # BullMQ workers
prisma/
├── schema.prisma
└── seed.ts                    # carga 5 themes preset
legacy/
└── SlidesIA.html              # POC original, referencia para portar prompts
```

## Roadmap

Plan completo: `.claude/plans/analiza-esta-app-que-delegated-cherny.md`

- ✅ **Fase 0** — Cimientos: scaffold, auth, DB, themes preset, deploy Railway
- 🔜 **Fase 1** — Portar motor de IA al backend (4 agentes → Slide Schema)
- ⏳ **Fase 2** — Editor visual (drag & drop, redimensionar, undo/redo)
- ⏳ **Fase 3** — Contenido rico (charts, tablas, iconos, video, equations)
- ⏳ **Fase 4** — PPTX 100% editable (texto/charts/tablas nativos)
- ⏳ **Fase 5** — Multi-IA + chat de refinamiento
- ⏳ **Fase 6** — Más inputs (PDF, Word, audio, multi-source)
- ⏳ **Fase 7** — Galería de plantillas + branding
- ⏳ **Fase 8** — Stripe billing + lanzamiento

## Scripts

```bash
npm run dev          # Next.js dev
npm run build        # build prod (corre prisma generate + next build)
npm run start        # arrancar build prod
npm run typecheck    # tsc --noEmit
npm run lint
npm run format       # prettier
npm run test         # vitest unit
npm run test:e2e     # playwright

npm run db:generate  # prisma generate
npm run db:migrate   # prisma migrate dev
npm run db:deploy    # prisma migrate deploy (CI)
npm run db:studio
npm run db:seed
```

## Deploy a Railway

1. Crea un proyecto vacío en Railway, conecta este repo.
2. Añade un servicio Postgres (Railway expone `DATABASE_URL`).
3. Añade un servicio Redis (expone `REDIS_URL`).
4. En el servicio app, configura todas las variables de `.env.example`.
5. Railway detecta `Dockerfile` y construye. El healthcheck (`/api/health`) confirma que la DB está conectada.
6. Las migraciones corren automáticamente al arrancar (ver `CMD` del Dockerfile).
