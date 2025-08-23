# Project Structure

## Root Directory
```
korean-food-arena/
├── src/                    # Source code
├── public/                 # Static assets
├── drizzle/               # Database migrations
├── .kiro/                 # Kiro configuration and specs
├── dist/                  # Build output
└── node_modules/          # Dependencies
```

## Source Code Organization

### Frontend (`src/react-app/`)
```
src/react-app/
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui base components
│   ├── mode-toggle.tsx   # Theme switching
│   └── theme-provider.tsx # Theme context
├── routes/               # File-based routing (TanStack Router)
├── lib/                  # Utility functions and configurations
│   ├── auth-client.ts    # Better-auth client setup
│   └── utils.ts          # General utilities
├── providers/            # React context providers
│   └── tanstack-query/   # TanStack Query setup
├── hooks/                # Custom React hooks
├── integrations/         # External service integrations
├── assets/               # Static assets (images, icons)
├── main.tsx              # Application entry point
├── routeTree.gen.ts      # Generated route tree (auto-generated)
├── styles.css            # Global styles
└── vite-env.d.ts         # Vite type definitions
```

### Backend (`src/worker/`)
```
src/worker/
├── db/                   # Database schema and configuration
│   ├── index.ts          # Database connection
│   ├── schema.ts         # Custom table schemas
│   └── auth-schema.ts    # Better-auth generated schema
├── lib/                  # Business logic and utilities
│   ├── __tests__/        # Unit tests
│   ├── createRuntimeAuth.ts # Auth configuration
│   └── pairKey.ts        # Pair key normalization utilities
└── index.ts              # Worker entry point and API routes
```

### Shared (`src/`)
```
src/
└── auth.ts               # Shared auth types and configuration
```

## Configuration Files

### TypeScript Configuration
- `tsconfig.json` - Root TypeScript configuration with project references
- `tsconfig.app.json` - Frontend TypeScript configuration
- `tsconfig.worker.json` - Backend TypeScript configuration  
- `tsconfig.node.json` - Node.js tooling TypeScript configuration

### Build & Development
- `vite.config.ts` - Vite configuration with plugins and aliases
- `vitest.config.ts` - Vitest testing configuration
- `wrangler.json` - Cloudflare Workers deployment configuration
- `drizzle.config.ts` - Drizzle ORM configuration for D1

### Code Quality
- `eslint.config.js` - ESLint configuration with React and TanStack rules
- `.prettierrc` - Prettier formatting configuration
- `.prettierignore` - Files to exclude from Prettier

### Package Management
- `package.json` - Main package configuration with scripts
- `pnpm-workspace.yaml` - pnpm workspace configuration
- `pnpm-lock.yaml` - Dependency lock file

## Key Conventions

### Import Paths
- Use `@/` alias for frontend imports: `import { Button } from '@/components/ui/button'`
- Relative imports for backend: `import { db } from './db'`
- Shared types: `import type { AuthVariables } from '../auth'`

### File Naming
- **Components**: PascalCase (`FoodComparison.tsx`)
- **Utilities**: camelCase (`createPairKey.ts`)
- **Routes**: kebab-case following TanStack Router conventions
- **Database**: camelCase for files, snake_case for table/column names

### Database Schema
- **Custom tables**: `food`, `vote`, `comment` (snake_case)
- **Better-auth tables**: `user`, `session`, `account`, `verification` (singular)
- **Migrations**: Auto-generated in `drizzle/` directory

### Testing
- **Unit tests**: Co-located in `__tests__/` directories
- **Test files**: `*.test.ts` or `*.test.tsx`
- **Test utilities**: Shared testing helpers in `lib/__tests__/`