# Technology Stack

## Frontend
- **React 18** with TypeScript for UI components
- **TanStack Router** for client-side routing with file-based routing
- **TanStack Query** for server state management and caching
- **Tailwind CSS** with shadcn/ui components for styling
- **Vite** for build tooling and development server

## Backend
- **Hono** framework running on Cloudflare Workers
- **Better-auth** with anonymous plugin for session management
- **Drizzle ORM** for type-safe database queries
- **Zod** for request/response validation

## Database & Infrastructure
- **Cloudflare D1** (SQLite) for data storage
- **Cloudflare Workers** for edge computing and API hosting
- **Cloudflare Assets** for static file serving

## Development Tools
- **TypeScript** with strict configuration across frontend and backend
- **ESLint** with React and TanStack plugins
- **Prettier** for code formatting
- **Vitest** for unit and integration testing
- **pnpm** for package management (use pnpm instead of npm)

## Common Commands

### Development
```bash
pnpm dev              # Start development server
pnpm test             # Run tests once
pnpm test:watch       # Run tests in watch mode
pnpm test:ui          # Run tests with UI
```

### Database
```bash
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate:local # Apply migrations to local D1
pnpm db:studio:prod   # Open Drizzle Studio for production DB
```

### Build & Deploy
```bash
pnpm build            # Build for production
pnpm preview          # Preview production build
pnpm check            # Type check + build + dry-run deploy
```

### Code Quality
```bash
pnpm format           # Format code with Prettier
pnpm lint             # Run ESLint
```

### Auth & Types
```bash
pnpm auth:generate    # Generate Better-auth schema
pnpm cf-typegen       # Generate Cloudflare Workers types
```

## Architecture Patterns

- **Monorepo Structure**: Frontend (`src/react-app/`) and backend (`src/worker/`) in single repository
- **File-based Routing**: TanStack Router with routes in `src/react-app/routes/`
- **Path Aliases**: Use `@/` for frontend imports (maps to `src/react-app/`)
- **Type Safety**: End-to-end TypeScript with Drizzle schema inference
- **Session Management**: Anonymous sessions with Better-auth, automatic session creation on first visit