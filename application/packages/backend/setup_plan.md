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
*   **Tooling Note:** TypeORM will be configured **not** to automatically synchronize or modify the database schema (i.e., `synchronize: false`).

## Development Principles & Decisions (Backend Relevant)

*   **TypeScript:** Prioritize strong typing; avoid `any` and `unknown`.
*   **Path Aliases:** Use configured aliases (`@common/*`, `@backend/*`).
*   **Minimalism & JIT:** Create code only when needed. Defer optional features.
*   **Configuration:** Use `@nestjs/config`, prioritize `process.env` over `.env`.
*   **Error Handling:** Use `GlobalHttpExceptionFilter`.
*   **Dependencies:** Use stable versions.
*   **Design Alignment:** Align with API defined in `../../docs/api/openapi.yaml`.

## Phase 1: Initial Backend Setup (Completed)

- [x] Initialize `package.json` with core NestJS dependencies.
- [x] Add NestJS dev dependencies.
- [x] Add TypeORM and config dependencies.
- [x] Create a basic `README.md`.
- [x] Create `tsconfig.json`.
- [x] Set up basic NestJS application structure (`src/main.ts`, `src/app.module.ts`).
- [x] Configure a global API prefix ('/api/v1').
- [x] Integrate `@nestjs/config` in `AppModule`.
- [x] Create `.env.example`.
- [x] Create `.env` file.
- [x] Configure `TypeOrmModule.forRootAsync` in `AppModule` (ensure `synchronize: false`).
- [x] Configure `main.ts` to use `APP_PORT` and `APP_HOST` env vars.
- [x] Add `@narrow-ai-matchmaker/common` package dependency.
- [x] Define placeholder `OnboardingModule`, `HealthController`.
- [x] Implement basic `GlobalHttpExceptionFilter`.

## Phase 2: Core Feature & Adapter Implementation

**Note:** Implement features iteratively. Create modules, interfaces, DTOs, entities, services, and controllers as needed for each step. Reference `../../docs/api/openapi.yaml` for API contracts.

### 2.1 Adapter Modules Setup

*   **`audio-storage/`**
    *   `[ ]` Define `IAudioStorageService` interface (`audio-storage.interface.ts`).
    *   `[ ]` Implement `LocalAudioStorageService` (`impl/local-audio-storage.service.ts`).
    *   `[ ]` Implement `S3AudioStorageService` (`impl/s3-audio-storage.service.ts`) including S3 client setup & config.
    *   `[ ]` Implement `AudioStorageModule` (`audio-storage.module.ts`) with factory provider based on `AUDIO_STORAGE_PROVIDER` env var.
    *   `[ ]` Add `AUDIO_STORAGE_PROVIDER` (e.g., `local`, `s3`), local storage path, and S3 config to `.env` / `.env.example`.
*   **`llm/`**
    *   `[ ]` Define `ILlmService` interface (`llm.interface.ts`) for required operations (e.g., parse, summarize, explain).
    *   `[ ]` Implement initial concrete LLM service (e.g., `OpenAiLlmService` in `impl/`).
    *   `[ ]` Implement `LlmModule` (`llm.module.ts`) with factory provider based on `LLM_PROVIDER` env var.
    *   `[ ]` Add `LLM_PROVIDER` and necessary API key/config env vars.
*   **`transcription/`**
    *   `[ ]` Define `ITranscriptionService` interface (`transcription.interface.ts`).
    *   `[ ]` Implement `AwsTranscribeService` (`impl/aws-transcribe.service.ts`) including Transcribe client setup & config.
    *   `[ ]` Implement `TranscriptionModule` (`transcription.module.ts`).
    *   `[ ]` Add necessary AWS config env vars if not handled globally.
*   **`vector-db/`**
    *   `[ ]` Define `IVectorDbService` interface (`vector-db.interface.ts`) for save/search operations.
    *   `[ ]` Implement `QdrantService` (`impl/qdrant.service.ts`) including Qdrant client setup & config.
    *   `[ ]` Implement `VectorDbModule` (`vector-db.module.ts`).
    *   `[ ]` Add necessary Qdrant connection env vars.

### 2.2 Foundational Feature Modules

*   **`users/`**
    *   `[ ]` Define `User` entity (`entities/user.entity.ts`) with necessary fields (ID, link to external auth ID like Cognito sub, email, timestamps).
    *   `[ ]` Implement `UsersService` (`users.service.ts`) for finding/creating users (needed by Auth/Onboarding).
    *   `[ ]` Implement `UsersModule` (`users.module.ts`) providing the service and importing `TypeOrmModule.forFeature([User])`.
*   **`events/`**
    *   `[ ]` Define `Event` entity (`entities/event.entity.ts`) (ID, name, description, dates, etc.).
    *   `[ ]` Define `Participation` entity (`entities/participation.entity.ts`) linking User, Event, storing event-specific context (goals, expectations).
    *   `[ ]` Implement `EventsService` (`events.service.ts`) for basic Event CRUD and Participation management.
    *   `[ ]` Implement `EventsModule` (`events.module.ts`) providing the service and importing `TypeOrmModule.forFeature([Event, Participation])`.
*   **`profiles/`**
    *   `[ ]` Define `Profile` entity (`entities/profile.entity.ts`) linking to User, storing extracted fields (name, headline, skills, summary, general goals, linked profiles).
    *   `[ ]` Implement `ProfilesService` (`profiles.service.ts`) for basic Profile CRUD.
    *   `[ ]` Implement `ProfilesModule` (`profiles.module.ts`) providing the service and importing `TypeOrmModule.forFeature([Profile])`.

### 2.3 Onboarding Flow Implementation

*   **`onboarding/`**
    *   `[ ]` Define `OnboardingSession` entity (`entities/onboarding-session.entity.ts`) tracking status, linked User/Event, audio contexts needed/uploaded.
    *   `[ ]` Implement `OnboardingService` (`onboarding.service.ts`):
        *   Logic for `initiateOnboarding`: create User, Profile, Participation, OnboardingSession; generate first presigned URL (`IAudioStorageService`).
        *   Logic for `requestAudioUploadUrl`: generate subsequent URLs (`IAudioStorageService`).
        *   Logic for `notifyUploadComplete`: update session status, trigger async content extraction.
        *   Logic for `getOnboardingStatus`.
        *   Logic for `getOnboardingProfileData`.
    *   `[ ]` Implement `OnboardingController` (`onboarding.controller.ts`) for endpoints in `openapi.yaml`.
    *   `[ ]` Define necessary DTOs (`dto/`) aligned with `openapi.yaml`.
    *   `[ ]` Implement `OnboardingModule` (`onboarding.module.ts`) importing `AudioStorageModule`, `UsersModule`, `ProfilesModule`, `EventsModule`, `TypeOrmModule.forFeature([OnboardingSession])`.

### 2.4 Content Extraction Implementation

*   **`content-extraction/`**
    *   `[ ]` Implement `ContentExtractionService` (`content-extraction.service.ts`):
        *   Fetch audio (`IAudioStorageService`).
        *   Transcribe (`ITranscriptionService`).
        *   Parse transcript using LLM (`ILlmService`) to extract structured data (profile info, event goals).
        *   Update `Profile` and/or `Participation` entities (via injected services or repositories).
    *   `[ ]` Implement `ContentExtractionModule` (`content-extraction.module.ts`) importing necessary Adapter modules and Feature Services/Repositories.
    *   `[ ]` Define trigger mechanism (e.g., Listener for an event emitted by `OnboardingService` on `notifyUploadComplete`).

### 2.5 Authentication Flow Implementation

*   **`auth/`**
    *   `[ ]` Install `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`.
    *   `[ ]` Implement `AuthService` (`auth.service.ts`):
        *   Handle `/auth/callback`: Exchange code with Cognito, find/create User (`UsersService`), potentially finalize onboarding (`OnboardingService`?), generate JWT.
        *   Handle `/auth/me`: Validate JWT, fetch user data.
    *   `[ ]` Implement `AuthController` (`auth.controller.ts`) for `openapi.yaml` endpoints.
    *   `[ ]` Define necessary DTOs (`dto/`).
    *   `[ ]` Implement `JwtStrategy` (`strategies/jwt.strategy.ts`).
    *   `[ ]` Implement `JwtAuthGuard` (`guards/jwt-auth.guard.ts`).
    *   `[ ]` Configure and import `JwtModule.registerAsync` and `PassportModule` in `AuthModule` (`auth.module.ts`). Import `UsersModule`.
    *   `[ ]` Add `JWT_SECRET`, `JWT_EXPIRATION` env vars.
    *   `[ ]` Apply `JwtAuthGuard` globally in `main.ts` or selectively on controllers.

### 2.6 Core API Features Implementation

*   **`events/`** (Continued)
    *   `[ ]` Implement `EventsController` endpoints: `GET /events`, `GET /events/{id}`, `POST /events/{id}/join`, `PUT /events/{id}/participants/me/context`.
    *   `[ ]` Define corresponding DTOs.
    *   `[ ]` Secure endpoints with `JwtAuthGuard`.
*   **`profiles/`** (Continued)
    *   `[ ]` Implement `ProfilesController` endpoints: `GET /profiles/me`, `PUT /profiles/me`, `GET /profiles/{user_id}`.
    *   `[ ]` Define corresponding DTOs (`UpdateProfileRequest`).
    *   `[ ]` Secure endpoints with `JwtAuthGuard`.
*   **`matching/`**
    *   `[ ]` Implement `MatchingService` (`matching.service.ts`):
        *   Fetch relevant user/profile/event data.
        *   Generate or retrieve embeddings.
        *   Query vector DB (`IVectorDbService`).
        *   Generate explanations (`ILlmService`).
    *   `[ ]` Implement `MatchingController` (`matching.controller.ts`) for `GET /events/{id}/matches` endpoint.
    *   `[ ]` Define `Match` DTO.
    *   `[ ]` Implement `MatchingModule` (`matching.module.ts`) importing `LlmModule`, `VectorDbModule`, and necessary Feature modules/repositories.
    *   `[ ]` Secure endpoint with `JwtAuthGuard`.

### 2.7 Cross-Cutting Concerns

*   **Request Validation:**
    *   `[ ]` Install `class-validator`, `class-transformer`.
    *   `[ ]` Add validation decorators to DTOs.
    *   `[ ]` Add `ValidationPipe` globally in `main.ts`.
*   **Testing:**
    *   `[ ]` Implement unit tests for services (mocking dependencies).
    *   `[ ]` Implement integration tests for controllers/services.
    *   `[ ]` Consider E2E tests later.

## Phase 3: Refinement & Deployment Prep

*   `[ ]` Refine error handling and logging.
*   `[ ]` Performance optimization (database indexing, query optimization).
*   `[ ]` Security hardening review.
*   `[ ]` Create `Dockerfile`.
*   `[ ]` Set up CI/CD pipeline. 