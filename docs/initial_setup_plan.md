# Initial Project Setup Plan

This plan outlines the steps to create the initial monorepo structure for the backend, frontend, and common modules. The focus is on establishing the core structure and defining basic interfaces, deferring detailed implementation logic.

## Development Principles & Decisions

*   **TypeScript:** Prioritize strong typing; avoid `any` and `unknown` where possible across all packages. Use `strict: true`.
*   **Path Aliases:** Configure TypeScript path aliases (e.g., `@common/*`, `@backend/*`, `@frontend/*`) for cleaner imports.
*   **Backend Configuration:** Implement basic strongly-typed configuration management using `@nestjs/config`.
*   **Backend Error Handling:** Implement a basic global exception filter in NestJS for consistent API error responses, aligned with `docs/api/openapi.yaml`.
*   **Frontend State:** Redux Toolkit will be used for global state management.
*   **Frontend Styling:** CSS Modules will be used (see guidelines below).
*   **Dependencies:** Use stable (LTS or latest stable, avoid alpha/beta/rc) versions of dependencies whenever possible.
*   **Design Alignment:** Initial backend modules/controllers/services and frontend component structure should align with the architecture defined in `docs/diagrams/raw/backend_services.d2` and the API defined in `docs/api/openapi.yaml`.
*   **Deferred Items (Initial Setup):**
    *   Detailed request validation (`class-validator`/`class-transformer`).
    *   Comprehensive testing (unit, integration, E2E).
    *   Authentication/Authorization flows (JWT, Guards).

## Frontend Styling (CSS Modules) Guidelines (Draft)

_(Note: These guidelines will be moved to `docs/styling_guidelines.md` once the frontend package is set up)._

To maintain consistency with CSS Modules, the following conventions should be followed:

1.  **File Structure:**
    *   Component-specific styles: Place `.module.css` files alongside their corresponding `.tsx` component file.
    *   Global styles: Use `packages/frontend/src/styles/global.css` for resets, base element styles, and CSS variable definitions.
    *   Shared component styles: Define styles for reusable UI components (e.g., a generic Button) in a structured way (e.g., `packages/frontend/src/components/common/Button/Button.module.css`).

2.  **Naming Conventions:**
    *   Use `camelCase` for CSS class names within modules (e.g., `.primaryButton`, `.profileCardHeader`).

3.  **CSS Variables (Design Tokens):**
    *   Define all core design tokens (colors, spacing, typography, etc.) as CSS variables in `global.css`.
    *   **Rule:** Always use these variables (`var(--variable-name)`) in `.module.css` files instead of hardcoded values.
    *   **Placeholders (to be defined):**
        *   `--color-primary`, `--color-secondary`, `--color-accent`, etc.
        *   `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`, etc.
        *   `--color-background-primary`, `--color-background-secondary`, etc.
        *   `--color-border-primary`, etc.
        *   `--space-xs`, `--space-sm`, `--space-md`, `--space-lg`, `--space-xl`, etc. (e.g., based on 4px/8px scale)
        *   `--font-family-base`, `--font-family-heading`, etc.
        *   `--font-size-sm`, `--font-size-md`, `--font-size-lg`, etc.
        *   `--font-weight-normal`, `--font-weight-bold`, etc.
        *   `--line-height-normal`, `--line-height-tight`, etc.
        *   `--border-radius-sm`, `--border-radius-md`, `--border-radius-lg`, etc.
        *   `--breakpoint-sm`, `--breakpoint-md`, `--breakpoint-lg`, etc.

4.  **Usage Guidelines:**
    *   Prioritize defined CSS variables.
    *   Keep selectors simple; use `composes` for intra-module style sharing if needed.
    *   Encapsulate component-specific styles within their module.

5.  **Responsiveness:**
    *   Adopt a mobile-first approach.
    *   Use defined breakpoint variables for media queries.

## Phase 1: Monorepo and Core Module Setup

### 1. Root Monorepo Configuration
- [ ] Create directories: `packages/`, `packages/backend/`, `packages/frontend/`, `packages/common/`.
- [ ] Initialize root `package.json` if it doesn't exist (`npm init -y` or equivalent).
- [ ] Configure npm workspaces in the root `package.json` to include `packages/*` (or explicitly `packages/backend`, `packages/frontend`, `packages/common`).
- [ ] Add root-level dev dependencies (e.g., `typescript`, potentially a monorepo task runner like `turbo` later if desired, but not initially).
- [ ] Add ESLint and Prettier configuration at the root, ensuring they can be extended/used by child packages.
- [ ] Establish basic root `tsconfig.base.json` if needed for shared TS settings.
- [ ] Create a root `.gitignore` file (add `.env`, `node_modules`, `dist`, build artifacts, etc.).
- [ ] Define basic root-level npm scripts (e.g., 'dev', 'build') that delegate to package-specific scripts (potentially using workspace commands or a tool like Turbo later).

### 2. Common Module (`packages/common/`)
- [ ] Initialize `packages/common/package.json` (e.g., `name: "@narrow-ai/common"`).
- [ ] Create `packages/common/tsconfig.json` (extending root base if applicable, configured for library output including declaration files `.d.ts`).
- [ ] Create a basic README.md within the package directory.
- [ ] Create basic source structure: `packages/common/src/`.
- [ ] Define placeholder directories within `packages/common/src/` (e.g., `interfaces/`, `dtos/`, `types/`, `utils/`).
- [ ] Define initial shared interfaces/types based on `docs/core_entities.md` (e.g., `User`, `Event`, `Profile` interfaces in `packages/common/src/interfaces/`). Keep simple for now.

### 3. Backend Module (`packages/backend/` - NestJS)
- [ ] Initialize `packages/backend/package.json` with core NestJS dependencies (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`, `reflect-metadata`, `rxjs`).
- [ ] Add NestJS dev dependencies (`@nestjs/cli`, `@nestjs/schematics`, `@types/node`, `@types/express`, `typescript`, etc.).
- [ ] Add TypeORM and config dependencies (`@nestjs/typeorm`, `typeorm`, `pg`, `@nestjs/config`).
- [ ] Create a basic README.md within the package directory.
- [ ] Create `packages/backend/tsconfig.json` (using NestJS defaults or extending root base, ensure path aliases are configured).
- [ ] Set up basic NestJS application structure (`packages/backend/src/main.ts`, `packages/backend/src/app.module.ts`, `packages/backend/src/app.controller.ts`, `packages/backend/src/app.service.ts`).
- [ ] Configure a global API prefix (e.g., '/api/v1') in `main.ts`.
- [ ] Integrate `@nestjs/config` in `AppModule` to load environment variables (consider typed config approach).
- [ ] Create `packages/backend/.env.example` with placeholder variables (e.g., `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `PORT`).
- [ ] Create `packages/backend/.env` file (and ensure it's in `.gitignore`). Populate with initial local development values.
- [ ] Configure `TypeOrmModule.forRootAsync` in `AppModule` using `ConfigService` to establish DB connection details (ensure `synchronize: false`).
- [ ] Configure `main.ts` to listen on the port specified by the `PORT` environment variable (defaulting if necessary for local dev).
- [ ] Add `common` package as a dependency in `packages/backend/package.json`.
- [ ] Define initial module/service/controller interfaces and classes (e.g., `UserModule`, `UserService`, `UserController`). Implement basic placeholder methods returning static data or mock objects conforming to `common` interfaces.
- [ ] Implement basic global exception filter.

### 4. Frontend Module (`packages/frontend/` - React/Vite)
- [ ] Initialize React + TypeScript project using Vite within the `packages/frontend/` directory (`npm create vite@latest . --template react-ts`). Adjust generated `package.json` name (e.g., `name: "@narrow-ai/frontend"`).
- [ ] Create a basic README.md within the package directory.
- [ ] Add `common` package as a dependency in `packages/frontend/package.json`.
- [ ] Configure `packages/frontend/tsconfig.json` (adjust `paths` if needed to resolve the `common` package correctly, configure path aliases).
- [ ] Set up Redux Toolkit for state management.
- [ ] Create `packages/frontend/src/styles/global.css` and `docs/styling_guidelines.md` (move guidelines from this plan).
- [ ] Define initial CSS variables (design tokens) in `global.css` based on draft guidelines.
- [ ] Create `packages/frontend/.env.example` with `VITE_BACKEND_API_URL`.
- [ ] Create `packages/frontend/.env` file (and ensure it's in `.gitignore`). Populate with the local backend URL (e.g., `http://localhost:3001/api`).
- [ ] Implement basic API service utility to read `import.meta.env.VITE_BACKEND_API_URL` for making backend calls.
- [ ] Create basic component structure (e.g., `packages/frontend/src/pages/`, `packages/frontend/src/components/`).
- [ ] Implement placeholder pages/components that might fetch/display mock data conforming to `common` interfaces.

### 5. Environment and Deployment Prep
- [ ] Refine backend `.env` loading in `AppModule` to potentially differentiate between local (`packages/backend/.env`) and Docker/AWS (system environment variables) based on `NODE_ENV` or a `CONFIG_SOURCE` variable.
- [ ] Review frontend build process (`npm run build`) and how environment variables (like `VITE_BACKEND_API_URL`) are handled for different deployment targets (local vs. AWS Amplify). Note if runtime configuration is needed for Amplify.
- [ ] Create a basic `packages/backend/Dockerfile` for building and running the NestJS application. Ensure it respects the `PORT` environment variable.
- [ ] Define basic build settings/commands required for Amplify deployment in `packages/frontend/package.json` or a placeholder `amplify.yml`.

## Phase 2: Feature Implementation (Details TBD)

- [ ] Implement actual service logic, database interactions, frontend components, etc., following the established structure and interfaces.
- [ ] Implement request validation.
- [ ] Add Authentication and Authorization.
- [ ] Add comprehensive tests.

---

This plan focuses on setting up the skeleton. We can brainstorm specific details for items like the exact configuration loading strategy or Dockerfile specifics once the basic structure is in place. 