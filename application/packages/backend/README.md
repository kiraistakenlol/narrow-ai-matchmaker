# Backend Package (@narrow-ai-matchmaker/backend)

This package contains the NestJS API server for the Narrow AI Matchmaker application.

## Running Locally

1.  **Database:** The application requires a PostgreSQL database. Use the provided `docker-compose.yml` file to run a local PostgreSQL container configured according to the `.env` file:
    ```bash
    # From the application/packages/backend directory
    docker-compose up -d
    ```
2.  **Application:** Start the NestJS server using the root script:
    ```bash
    # From the workspace root directory
    ./start-backend.sh
    ```

## Directory Structure

```
application/packages/backend/
├── dist/                     # Compiled JavaScript output
├── node_modules/             # Project dependencies
├── src/                      # Source code root
│   ├── app.module.ts         # Root application module
│   ├── main.ts               # Application entry point (bootstrap)
│   │
│   ├── common/               # Shared backend utilities, filters, base classes
│   │   ├── filters/          # (e.g., http-exception.filter.ts)
│   │   └── ...
│   │
│   ├── config/               # Config loading & validation
│   │   ├── config.schema.ts
│   │   ├── configuration.ts
│   │   └── index.ts
│   │
│   ├── audio-storage/        # --- Abstract Audio Storage Adapter ---
│   │   ├── audio-storage.module.ts         # Provides IAudioStorageService via factory
│   │   ├── audio-storage.interface.ts      # Defines the abstract IAudioStorageService
│   │   └── impl/                           # Concrete implementations
│   │       ├── local-audio-storage.service.ts # Implements local disk storage
│   │       └── s3-audio-storage.service.ts    # Implements S3 storage (Configures S3 client internally)
│   │
│   ├── llm/                  # --- Abstract LLM Provider Adapter ---
│   │   ├── llm.module.ts             # Provides ILlmService via factory
│   │   ├── llm.interface.ts          # Defines the abstract ILlmService
│   │   └── impl/                     # Concrete implementations
│   │       ├── openai-llm.service.ts # Implements OpenAI interaction
│   │       └── ...                   # Other LLM providers
│   │
│   ├── transcription/        # --- Abstract Transcription Adapter ---
│   │   ├── transcription.module.ts       # Provides ITranscriptionService
│   │   ├── transcription.interface.ts    # Defines the abstract ITranscriptionService
│   │   └── impl/                         # Concrete implementations
│   │       └── aws-transcribe.service.ts # Implements Transcribe (Configures Transcribe client internally)
│   │
│   ├── vector-db/            # --- Abstract Vector DB Adapter ---
│   │   ├── vector-db.module.ts       # Provides IVectorDbService
│   │   ├── vector-db.interface.ts    # Defines the abstract IVectorDbService
│   │   └── impl/                     # Concrete implementations
│   │       └── qdrant.service.ts     # Concrete Qdrant client implementation
│   │
│   ├── health/               # --- Feature: Health Check ---
│   │   └── health.controller.ts
│   │
│   ├── onboarding/           # --- Feature: Onboarding ---
│   │   ├── onboarding.module.ts    # Imports AudioStorageModule
│   │   ├── onboarding.controller.ts
│   │   ├── onboarding.service.ts   # Injects IAudioStorageService
│   │   ├── dto/
│   │   └── entities/
│   │
│   ├── auth/                 # --- Feature: Authentication ---
│   │   ├── auth.module.ts      # Handles identity provider logic (e.g., Cognito interactions directly)
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   ├── guards/
│   │   └── dto/
│   │
│   ├── profiles/             # --- Feature: Profiles ---
│   │   ├── profiles.module.ts
│   │   ├── profiles.controller.ts
│   │   ├── profiles.service.ts
│   │   ├── dto/
│   │   └── entities/
│   │
│   ├── events/               # --- Feature: Events ---
│   │   ├── events.module.ts
│   │   ├── events.controller.ts
│   │   ├── events.service.ts
│   │   ├── dto/
│   │   └── entities/
│   │
│   ├── matching/             # --- Feature: Matching ---
│   │   ├── matching.module.ts    # Imports LlmModule, VectorDbModule
│   │   ├── matching.controller.ts
│   │   └── matching.service.ts   # Injects ILlmService, IVectorDbService
│   │
│   ├── users/                # --- Feature: Users --- 
│   │   ├── users.module.ts
│   │   ├── users.service.ts
│   │   └── entities/
│   │
│   └── content-extraction/   # --- Feature: Content Extraction ---
│       ├── content-extraction.module.ts # Imports AudioStorageModule, LlmModule, TranscriptionModule
│       └── content-extraction.service.ts # Injects IAudioStorageService, ILlmService, ITranscriptionService
│
├── .env                      # Local environment variables (ignored by git)
├── .env.example              # Example environment variables
├── .eslintignore
├── .eslintrc.js
├── .gitignore                # Should likely be handled by the root .gitignore
├── .prettierrc.js
├── nest-cli.json             # NestJS CLI configuration
├── package.json
├── README.md                 # This file
├── setup_plan.md             # Backend-specific setup plan and guidelines
├── tsconfig.build.json       # TS config for production build
└── tsconfig.json             # TS config for development
```

## Key Principles

1.  **Modularity:** Feature modules (`onboarding/`, `auth/`, etc.) and Adapter modules (`audio-storage/`, `llm/`, etc.) are top-level under `src/`.
2.  **Separation of Concerns:** Feature modules contain core business logic. Adapter modules handle interaction with external services/abstractions. `common/` holds shared utilities.
3.  **Dependency Injection & Abstraction:** Feature services depend on abstract interfaces (`IAudioStorageService`, `ILlmService`, etc.) provided by Adapter modules. Adapter modules use factories based on configuration to provide concrete implementations.
4.  **Co-location:** DTOs and Entities are generally co-located within the feature module that owns them.
5.  **Configuration:** Managed via `@nestjs/config`, validation via `src/config/`, environment variables control implementations.

See [setup_plan.md](./setup_plan.md) for detailed setup steps. 