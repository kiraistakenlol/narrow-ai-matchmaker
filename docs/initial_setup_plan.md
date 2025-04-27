# Initial Project Setup Plan

This plan outlines the steps to create the initial monorepo structure within the `/application` directory. The focus is on establishing the core structure (backend, frontend, common) and defining basic interfaces, deferring detailed implementation logic.

**Execution Note:** This plan will be executed step-by-step. Completed items will be marked with `[x]`. Please wait for user approval before proceeding to the next unmarked step or sub-step.

## Development Principles & Decisions

*   **TypeScript:** Prioritize strong typing; avoid `any` and `unknown` where possible across all packages. Use `strict: true`.
*   **Path Aliases:** Configure TypeScript path aliases (e.g., `@common/*`, `@backend/*`, `@frontend/*`) for cleaner imports within the monorepo.
*   **Minimalism & Just-In-Time (JIT):** Strive for simplicity and avoid unnecessary complexity or boilerplate. Create code, files, classes, interfaces, and components only when they are needed for the immediate task or feature, rather than creating placeholders in advance. If a feature or configuration is optional or not immediately required, defer adding it.
*   **Backend Configuration:** Implement basic strongly-typed configuration management using `@nestjs/config`.
*   **Backend Error Handling:** Implement a basic global exception filter in NestJS for consistent API error responses, aligned with `docs/api/openapi.yaml`.
*   **Frontend State:** Redux Toolkit will be used for global state management.
*   **Frontend Styling:** CSS Modules will be used (see guidelines below).
*   **Dependencies:** Use stable (LTS or latest stable, avoid alpha/beta/rc) versions of dependencies whenever possible.
*   **Design Alignment:** Initial backend modules/controllers/services and frontend component structure should align with the architecture defined in `docs/diagrams/raw/backend_services.d2` and the API defined in `docs/api/openapi.yaml`.
*   **Monorepo Root Directory (`application/`):** Keep the `application/` directory clean and minimal relative to the packages it contains. It should primarily contain configuration files essential for the monorepo structure (like `application/package.json` for workspaces), shared development tooling setup (e.g., `application/tsconfig.base.json`, ESLint/Prettier configs), and top-level monorepo scripts. Avoid adding package-specific code, dependencies (other than shared dev tools), or configuration files directly in `application/`.
*   **Deferred Items (Initial Setup):**
    *   Detailed request validation (`class-validator`/`class-transformer`).
    *   Comprehensive testing (unit, integration, E2E).
    *   Authentication/Authorization flows (JWT, Guards).

## Frontend Styling (CSS Modules) Guidelines (Draft)

_(Note: These guidelines will be moved to `docs/styling_guidelines.md` once the frontend package is set up)._

To maintain consistency with CSS Modules, the following conventions should be followed:

1.  **File Structure:**
    *   Component-specific styles: Place `.module.css` files alongside their corresponding `.tsx` component file.
    *   Global styles: Use `application/packages/frontend/src/styles/global.css` for resets, base element styles, and CSS variable definitions.
    *   Shared component styles: Define styles for reusable UI components (e.g., a generic Button) in a structured way (e.g., `application/packages/frontend/src/components/common/Button/Button.module.css`).

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

## Phase 1: Monorepo and Core Module Setup (`application/` directory)

### 1. Monorepo Root Configuration (`application/`)
- [x] Create the main directory: `application/`.
- [x] Create package directories: `application/packages/`, `application/packages/backend/`, `application/packages/frontend/`, `application/packages/common/`.
- [x] Initialize `application/package.json` (`cd application && npm init -y`).
- [x] Configure npm workspaces in `application/package.json` to include `packages/*`.
- [x] Add root-level dev dependencies *within `application/`* (e.g., `typescript`, `cd application && npm install -D typescript`).
- [x] Add ESLint and Prettier configuration within `application/` (`application/.eslintrc.js`, `application/.prettierrc.js`). Install dependencies via `cd application && npm install -D ...`.
- [x] Establish basic `application/tsconfig.base.json` if needed for shared TS settings.
- [x] Create `application/.gitignore` (add `.env`, `node_modules`, `dist`, build artifacts, etc.).
- [x] Define basic root-level npm scripts in `application/package.json` (e.g., 'dev', 'build') that delegate to package-specific scripts.

### 2. Common Module (`application/packages/common/`)
- [x] Initialize `application/packages/common/package.json` (e.g., `name: "@narrow-ai-matchmaker/common"`).
- [x] Create `application/packages/common/tsconfig.json` (extending `../../tsconfig.base.json` if applicable, configured for library output).
- [x] Create a basic README.md within the package directory (`application/packages/common/README.md`).
- [x] Create basic source structure: `application/packages/common/src/`.
- [x] Create `application/packages/common/src/index.ts` as the main export point.

### 3. Backend Module (`application/packages/backend/` - NestJS)
- [ ] Initialize `application/packages/backend/package.json` with core NestJS dependencies.
- [ ] Add NestJS dev dependencies.
- [ ] Add TypeORM and config dependencies (`@nestjs/typeorm`, `typeorm`, `pg`, `@nestjs/config`).
- [ ] Create a basic README.md (`application/packages/backend/README.md`).
- [ ] Create `application/packages/backend/tsconfig.json` (using NestJS defaults or extending `../../tsconfig.base.json`, ensure path aliases are configured).
- [ ] Set up basic NestJS application structure (`src/main.ts`, `src/app.module.ts`, etc.).
- [ ] Configure a global API prefix (e.g., '/api/v1') in `main.ts`.
- [ ] Integrate `@nestjs/config` in `AppModule`.
- [ ] Create `application/packages/backend/.env.example`.
- [ ] Create `application/packages/backend/.env` file (and ensure it's in `application/.gitignore`).
- [ ] Configure `TypeOrmModule.forRootAsync` in `AppModule` (ensure `synchronize: false`).
- [ ] Configure `main.ts` to use `PORT` env var.
- [ ] Add `@narrow-ai-matchmaker/common` package as a dependency in `application/packages/backend/package.json`.
- [ ] Define initial module/service/controller interfaces/classes.
- [ ] Implement basic global exception filter.

### 4. Frontend Module (`application/packages/frontend/` - React/Vite)
- [ ] Initialize React + TypeScript project using Vite within `application/packages/frontend/` (`npm create vite@latest . --template react-ts`). Adjust name.
- [ ] Create a basic README.md (`application/packages/frontend/README.md`).
- [ ] Add `@narrow-ai/common` package as a dependency.
- [ ] Configure `application/packages/frontend/tsconfig.json` (configure path aliases).
- [ ] Set up Redux Toolkit.
- [ ] Create `application/packages/frontend/src/styles/global.css` and `docs/styling_guidelines.md` (move guidelines from this plan).
- [ ] Define initial CSS variables (design tokens) in `global.css`.
- [ ] Create `application/packages/frontend/.env.example` with `VITE_BACKEND_API_URL`.
- [ ] Create `application/packages/frontend/.env` file (and ensure it's in `application/.gitignore`).
- [ ] Implement basic API service utility reading `VITE_BACKEND_API_URL`.
- [ ] Create basic component structure (`src/pages/`, `src/components/`).
- [ ] Implement placeholder pages/components using `common` interfaces.
- [ ] Implement basic API service utility reading `VITE_BACKEND_API_URL`.

### 5. Environment and Deployment Prep
- [ ] Refine backend `.env` loading in `AppModule` for local vs. Docker/AWS.
- [ ] Review frontend build process for env var handling (Amplify).
- [ ] Create a basic `application/packages/backend/Dockerfile`.
- [ ] Define basic build settings/commands for Amplify deployment in `application/packages/frontend/package.json` or a placeholder `amplify.yml`.
- [ ] Add Authentication and Authorization.
- [ ] Add comprehensive tests.

## Phase 2: Feature Implementation (Details TBD)

- [ ] **Backend:** Implement core service logic, database interactions, and API endpoints according to `openapi.yaml`.
- [ ] **Frontend:** Implement core UI components and pages, connecting to the implemented backend API.
- [ ] Implement request validation.
- [ ] Add Authentication and Authorization.
- [ ] Add comprehensive tests.

---

This plan focuses on setting up the skeleton. We can brainstorm specific details for items like the exact configuration loading strategy or Dockerfile specifics once the basic structure is in place.

(Note: Specific interfaces, classes, components, modules, DTOs, etc., will be created in Phase 2 as required by feature implementation, following the JIT principle.)