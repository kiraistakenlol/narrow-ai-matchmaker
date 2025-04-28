# Backend Setup Plan & Guidelines

This document consolidates the setup steps, guidelines, and technology stack specific to the backend (`@narrow-ai-matchmaker/backend`) package.

**See Also:** [Backend README](./README.md) (Includes recommended directory structure)

## Technology Stack Summary

*   **Runtime:** Node.js
*   **Framework:** NestJS
*   **Language:** TypeScript
*   **Database ORM:** TypeORM
*   **Relational Database:** PostgreSQL
*   **Audio Storage:** AWS S3
*   **Transcription:** AWS Transcribe

## Database Schema Management (Development)

*   **Approach:** Manual DDL Scripts
*   **Process:** Database schema changes during development will be managed by manually writing and applying SQL DDL scripts.
*   **Tooling Note:** TypeORM will be configured **not** to automatically synchronize or modify the database schema (i.e., `synchronize: false` and migrations will not be used during active development).

## Development Principles & Decisions (Backend Relevant)

*   **TypeScript:** Prioritize strong typing; avoid `any` and `unknown` where possible. Use settings from `../../tsconfig.base.json` and specific overrides in `./tsconfig.json`.
*   **Path Aliases:** Use configured TypeScript path aliases (`@common/*`, `@backend/*`) for cleaner imports.
*   **Minimalism & Just-In-Time (JIT):** Strive for simplicity. Create code, files, classes, interfaces only when needed. Defer optional features/config.
*   **Configuration:** Implement strongly-typed configuration management using `@nestjs/config`, `Joi` validation, and `.env` files.
*   **Error Handling:** Implement a basic global exception filter (`src/common/filters/http-exception.filter.ts`) for consistent API error responses.
*   **Dependencies:** Use stable versions.
*   **Design Alignment:** Backend modules/controllers/services should align with the API defined in `../../docs/api/openapi.yaml`.
*   **Audio Storage Strategy:** Audio files are stored exclusively in AWS S3.
    *   Environment variables `AWS_REGION` and `AWS_S3_BUCKET_AUDIO` are required.
    *   The `S3AudioStorageService` handles generating presigned PUT URLs for client uploads and retrieving audio streams.
    *   The previous local storage strategy and related components (`LocalAudioStorageService`, `LocalUploadController`) have been removed.
*   **Transcription Strategy:** Transcription is handled exclusively by AWS Transcribe.
    *   Environment variables `AWS_REGION` and `AWS_TRANSCRIBE_OUTPUT_BUCKET` are required.
    *   The `AwsTranscribeService` handles starting transcription jobs (using S3 URIs) and polling/retrieving results.
*   **LLM Strategy:** LLM interactions are abstracted via `ILlmService`.
    *   `LlmModule` uses a factory to select provider based on `LLM_PROVIDER` env var.
    *   Initial providers: `mock`, (`openai`, `groq` to be added).
*   **Content Extraction:** The `ContentExtractionService` orchestrates transcription and LLM processing.
*   **Simplified Abstractions:** Initial abstractions for choosing providers (audio, transcription) were removed in favor of direct AWS service usage to simplify the current setup.
*   **Deferred Items:**
    *   Detailed request validation (`class-validator`/`class-transformer` integration in DTOs).
    *   Comprehensive testing (unit, integration, E2E).
    *   Authentication/Authorization flows (JWT, Guards).
    *   Refined `.env` loading (currently uses `.env.<NODE_ENV>` fallback to `.env`).
    *   `Dockerfile` creation.

## Phase 1: Initial Backend Setup & Core Services

- [x] Initialize `package.json` with core NestJS dependencies.
- [x] Add NestJS dev dependencies.
- [x] Add TypeORM and config dependencies (`@nestjs/typeorm`, `typeorm`, `pg`, `@nestjs/config`, `joi`).
- [x] Add AWS SDK dependencies (`@aws-sdk/client-s3`, `@aws-sdk/client-transcribe`, `@aws-sdk/s3-request-presigner`).
- [x] Add LLM SDK dependencies (`groq-sdk`).
- [x] Create a basic README.md (`README.md`).
- [x] Create `tsconfig.json` (extending `../../tsconfig.base.json`, ensure path aliases are configured).
- [x] Set up basic NestJS application structure (`src/main.ts`, `src/app.module.ts`).
- [x] Configure a global API prefix ('/api/v1') in `main.ts`.
- [x] Integrate `@nestjs/config` in `AppModule` with Joi validation and `.env` loading.
- [x] Create `.env.example`.
- [x] Configure `TypeOrmModule.forRootAsync` in `AppModule` (ensure `synchronize: false`).
- [x] Configure `main.ts` to use `APP_PORT` and `APP_HOST` env vars.
- [x] Add `@narrow-ai-matchmaker/common` package as a dependency in `package.json`.
- [x] Implement basic global exception filter (`src/common/filters/http-exception.filter.ts`).
- [x] Implement `S3AudioStorageService` and `AudioStorageModule` (S3 only).
- [x] Implement `AwsTranscribeService` and `TranscriptionModule` (AWS only).
- [x] Implement `ILlmService`, `MockLlmService`, `GroqLlmService`, and `LlmModule`.
- [x] Implement `ContentExtractionService` and `ContentExtractionModule`.
- [x] Define initial core feature modules/services/controllers/entities (Users, Profiles, Events, Onboarding, Health). 
- [x] Fix build errors and ensure application starts.

## Phase 2: Feature Implementation (Details TBD)

- [ ] Implement core service logic for Onboarding, Profiles, Events, Matching, etc.
- [ ] Implement database interactions according to schema.
- [ ] Implement API endpoints according to `../../docs/api/openapi.yaml`.
- [ ] Implement request validation (`class-validator`/`class-transformer`).
- [ ] Add Authentication and Authorization (JWT, Guards).
- [ ] Add comprehensive tests (unit, integration, E2E).

## Other Considerations

- [ ] Create a basic `Dockerfile`.
- [ ] Refine LLM service implementations (OpenAI, Anthropic?).
- [ ] Add Vector DB integration (`qdrant.service.ts`).
- [ ] Implement robust polling/webhook for async jobs (Transcription). 