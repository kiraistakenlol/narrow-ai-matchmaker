# Matching Implementation Plan

This document outlines the steps to integrate real matching capabilities using Qdrant and OpenAI embeddings.

## Phase 1: Backend - Embedding Infrastructure Setup

### 1.1. Update Docker Compose for Qdrant
   - **File**: `application/packages/backend/docker-compose.yml`
   - **Action**: Add a Qdrant service configuration.
     - Refer to `matching/playground/docker-compose.yml` for an example.
     - Ensure ports (e.g., 6333 for HTTP, 6334 for gRPC) are mapped.
     - Configure a volume for Qdrant storage to persist data (e.g., `./qdrant_storage_backend:/qdrant/storage`).

### 1.2. Create Embedding Service
   - **File**: `application/packages/backend/src/embedding/embedding.service.ts`
   - **Purpose**: Handles all interactions with OpenAI for embedding generation and Qdrant for vector storage and search.
   - **Key Components**:
     - **Constructor**:
       - Initialize `QdrantClient` (pointing to the Dockerized Qdrant instance).
       - Initialize `OpenAI` client (requires `OPENAI_API_KEY` from `.env`).
       - Logger instance.
     - **`ensureCollectionExists(collectionName: string)` method**:
       - Checks if the specified Qdrant collection exists.
       - If not, creates it with a predefined vector size (e.g., 3072 for `text-embedding-3-large`) and distance metric (e.g., Cosine).
       - Hardcode `collectionName` to `"profiles"` for now within methods that use it, or pass it as an argument.
     - **`embedAndStoreProfile(profileId: string, rawProfileDescription: string)` method**:
       - Takes `profileId` (internal application user/profile ID) and `rawProfileDescription` (text content representing the user).
       - Generates a vector embedding for `rawProfileDescription` using the OpenAI API (e.g., `text-embedding-3-large`).
       - Upserts the generated vector into the `"profiles"` collection in Qdrant.
         - The Qdrant point ID could be a hash of `profileId` or `profileId` itself if Qdrant supports string UUIDs directly as IDs (the example uses a hash).
         - The payload should store the original `profileId` and potentially a snippet of `rawProfileDescription` for context.
     - **Helper functions**: (e.g., `hashCode` if needed for numeric Qdrant point IDs, similar to the example).

### 1.3. Create Embedding Module
   - **File**: `application/packages/backend/src/embedding/embedding.module.ts`
   - **Action**:
     - Create a standard NestJS module.
     - Declare `EmbeddingService` as a provider.
     - Export `EmbeddingService` so it can be injected into other services.

### 1.4. Update App Module
   - **File**: `application/packages/backend/src/app.module.ts`
   - **Action**:
     - Import `EmbeddingModule`.
     - Add `EmbeddingModule` to the `imports` array of `AppModule`.

## Phase 2: Backend - Matches Service Enhancement

### 2.1. Update Matches Service
   - **File**: `application/packages/backend/src/matches/matches.service.ts`
   - **Actions**:
     - **Inject `EmbeddingService`**:
       - Add `EmbeddingService` to the constructor.
     - **Implement `injectProfile(profileId: string, rawProfileDescription: string)` method**:
       - This method will call `embeddingService.embedAndStoreProfile(profileId, rawProfileDescription)`.
       - Handle any errors from the embedding service.
     - **`findTopMatches(userId: string)` method**:
       - **For now, this method will continue to return mock data.**
       - (Future enhancement: This method would fetch the current user's profile, generate its embedding, query Qdrant for similar profiles, and then fetch those profiles' details to construct `MatchDto[]`.)

## Phase 3: Backend - Onboarding Service Integration

### 3.1. Update Onboarding Service
   - **File**: `application/packages/backend/src/onboarding/onboarding.service.ts`
   - **Actions**:
     - **Inject `MatchesService`**:
       - Add `MatchesService` to the constructor.
     - **Integrate Profile Injection**:
       - In the `processAudio` method, after a user's profile has been successfully updated/created and their onboarding status is determined to be `OnboardingStatus.COMPLETED`:
         - Retrieve the `updatedProfile` (ensure it has an `id` and relevant text for matching).
         - Call `this.matchesService.injectProfile(updatedProfile.id, relevantProfileText)`.
           - `relevantProfileText` could be `updatedProfile.data.raw_input` if available and comprehensive, or the `transcriptText` if that's the primary source for profile generation.
         - Ensure this call is made after the profile is confirmed complete and saved.

## Phase 4: Environment Configuration

### 4.1. .env File
   - **Action**: Add `OPENAI_API_KEY="your_actual_openai_api_key"` to the relevant `.env` file(s) for the backend.

---

This plan prioritizes setting up the infrastructure for embedding and injecting profiles into the vector database. The actual search/matching logic in `findTopMatches` will be a subsequent step.
