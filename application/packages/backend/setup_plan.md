# Backend Setup Plan & Guidelines

This document consolidates the setup steps, guidelines, and technology stack specific to the backend (`@narrow-ai-matchmaker/backend`) package.

**See Also:** [Backend README](./README.md) (Includes recommended directory structure)

## Technology Stack Summary

*   **Runtime:** Node.js
*   **Framework:** NestJS
*   **Language:** TypeScript
*   **Database ORM:** TypeORM
*   **Relational Database:** PostgreSQL

## Database Schema Management (Development)

*   **Approach:** Manual DDL Scripts
*   **Process:** Database schema changes during development will be managed by manually writing and applying SQL DDL scripts.
*   **Tooling Note:** TypeORM will be configured **not** to automatically synchronize or modify the database schema (i.e., `synchronize: false` and migrations will not be used during active development).

## Development Principles & Decisions (Backend Relevant)

*   **TypeScript:** Prioritize strong typing; avoid `any` and `unknown` where possible. Use settings from `../../tsconfig.base.json` and specific overrides in `./tsconfig.json`.
*   **Path Aliases:** Use configured TypeScript path aliases (`@common/*`, `@backend/*`) for cleaner imports.
*   **Minimalism & Just-In-Time (JIT):** Strive for simplicity. Create code, files, classes, interfaces only when needed. Defer optional features/config.
*   **Configuration:** Implement strongly-typed configuration management using `@nestjs/config`, prioritizing `process.env` over `.env`.
*   **Error Handling:** Implement a basic global exception filter (`src/common/filters/http-exception.filter.ts`) for consistent API error responses, aligned with `../../docs/api/openapi.yaml`.
*   **Dependencies:** Use stable versions.
*   **Design Alignment:** Backend modules/controllers/services should align with the API defined in `../../docs/api/openapi.yaml`.
*   **Initial Storage Strategy:** During initial development, audio files will be stored locally on disk. This involves a single audio upload per session initially.
    *   Set the environment variable `AUDIO_STORAGE_PROVIDER=local`.
    *   Set `AUDIO_LOCAL_STORAGE_PATH=./data/audio` (relative to the backend package root).
    *   Files will be saved within this directory (e.g., `./data/audio/onboarding/SESSION_ID/audio.wav`).
    *   The `/onboarding/initiate` endpoint generates a storage path and returns a local backend URL (e.g., `http://localhost:PORT/api/v1/_local-upload/ENCODED_KEY`) for the client to `PUT` the audio file.
    *   A dedicated controller (`LocalUploadController`) handles these `PUT` requests, parsing the raw request body and saving the file using `LocalAudioStorageService`.
    *   The client then calls `/onboarding/SESSION_ID/notify-upload` with the storage key (`s3_key`) to confirm the upload.
    *   Ensure the `./data` directory is added to the root `.gitignore` file.
*   **Deferred Items (Initial Setup):**
    *   Detailed request validation (`class-validator`/`class-transformer`).
    *   Comprehensive testing (unit, integration, E2E).
    *   Authentication/Authorization flows (JWT, Guards).

## Phase 1: Initial Backend Setup

- [x] Initialize `package.json` with core NestJS dependencies.
- [x] Add NestJS dev dependencies.
- [x] Add TypeORM and config dependencies (`@nestjs/typeorm`, `typeorm`, `pg`, `@nestjs/config`).
- [x] Create a basic README.md (`README.md`).
- [x] Create `tsconfig.json` (extending `../../tsconfig.base.json`, ensure path aliases are configured).
- [x] Set up basic NestJS application structure (`src/main.ts`, `src/app.module.ts`).
- [x] Configure a global API prefix ('/api/v1') in `main.ts`.
- [x] Integrate `@nestjs/config` in `AppModule`.
- [x] Create `.env.example`.
- [x] Create `.env` file (and ensure it's in root `.gitignore`).
- [x] Configure `TypeOrmModule.forRootAsync` in `AppModule` (ensure `synchronize: false`).
- [x] Configure `main.ts` to use `APP_PORT` and `APP_HOST` env vars.
- [x] Add `@narrow-ai-matchmaker/common` package as a dependency in `package.json`.
- [x] Define initial module/service/controller interfaces/classes (Placeholder `OnboardingModule`, `HealthController`).
- [x] Implement basic global exception filter (`src/common/filters/http-exception.filter.ts`).

## Phase 2: Feature Implementation (Details TBD)

- [ ] Implement core service logic, database interactions, and API endpoints according to `../../docs/api/openapi.yaml`.
- [ ] Implement request validation (`class-validator`/`class-transformer`).
- [ ] Add Authentication and Authorization (JWT, Guards).
- [ ] Add comprehensive tests (unit, integration, E2E).

## Other Considerations

- [ ] Refine `.env` loading in `AppModule` for local vs. Docker/AWS (Current setup prioritizes `process.env`).
- [ ] Create a basic `Dockerfile`. 