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

## Quickstart con Docker

**Todo el stack corre en Docker — un solo comando levanta app + DB + Redis + pgAdmin.**
Necesitas Docker Desktop corriendo. Los puertos no chocan con los stacks típicos en `5432`/`5050`.

```bash
# 1. Variables de entorno (rellena cuando estés listo: OAuth, Gemini, etc.)
cp .env.example .env.local

# 2. Levantar TODO el stack
docker compose up -d --build

# Servicios:
#   App      → http://localhost:3000
#   Postgres → localhost:5434  (user/db: slidespro)
#   Redis    → localhost:6380
#   pgAdmin  → http://localhost:5052  (admin@slidespro.app / admin)
#              servidor "SlidesPro Postgres" ya preconfigurado

# 3. Ver logs de la app (migraciones + seed corren al primer arranque)
docker compose logs -f app
```

Abre [http://localhost:3000](http://localhost:3000). Las migraciones y los 5 themes preset
(Apple, Editorial, CleanTech, Bold, Dark) se aplican automáticamente.

### Comandos útiles

```bash
docker compose up -d --build      # levantar todo (build si cambió Dockerfile)
docker compose down               # apagar
docker compose down -v            # apagar + borrar volúmenes (reset DB completo)
docker compose logs -f app        # logs de la app
docker compose logs -f postgres   # logs de Postgres
docker compose ps                 # estado
docker compose exec app sh        # shell dentro del contenedor de la app
docker compose exec app npx prisma studio  # GUI de Prisma en :5555
```

### Modo dev híbrido (hot reload más rápido)

Si quieres correr la app en host con `npm run dev` (Turbopack es más responsivo
fuera de Docker), arranca solo los servicios:

```bash
docker compose up -d postgres redis pgadmin
npm install
npm run db:migrate     # genera/aplica migraciones
npm run db:seed
npm run dev
```

Y en `.env.local` descomenta:
```
DATABASE_URL=postgres://slidespro:slidespro@localhost:5434/slidespro
REDIS_URL=redis://localhost:6380
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
docker-compose.yml      # stack completo: app + postgres + redis + pgadmin
docker/pgadmin/         # servidor SlidesPro preconfigurado
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
