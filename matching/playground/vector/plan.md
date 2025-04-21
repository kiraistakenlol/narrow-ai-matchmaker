# Qdrant & OpenAI Embedding Implementation Plan (JavaScript/TypeScript)

This plan outlines the steps to load user profiles from `conference_data.json` into a local Qdrant instance using OpenAI embeddings with Node.js (TypeScript).

- [ ] **1. Environment Setup:**
    - [ ] Install necessary Node.js packages: `npm install @qdrant/js-client-rest openai dotenv` (or `yarn add ...`).
    - [ ] Set up OpenAI API Key securely (e.g., using a `.env` file and `dotenv` package).

- [ ] **2. Qdrant Instance Setup:**
    - [ ] Run Qdrant locally using Docker (pull official image, run container).
    - [ ] Verify Qdrant accessibility (Docker logs, web UI at `http://localhost:6333/dashboard`).

- [ ] **3. Qdrant Collection Design & Creation:**
    - [ ] Decide on collection parameters:
        - [ ] Name (e.g., `conference_profiles`).
        - [ ] Vector size (must exactly match the embedding model's output dimension, e.g., 1536 for `text-embedding-3-small`).
        - [ ] Distance metric (`Distance.Cosine` recommended for OpenAI embeddings).
    - [ ] Create the collection using the Qdrant JS client (`new QdrantClient(...).createCollection(...)`).

- [ ] **4. OpenAI Embedding Integration & Key Concepts:**
    - [ ] Initialize OpenAI client with API key (`new OpenAI()`).
    - [ ] **Key Parameters/Considerations for `openai.embeddings.create()`:**
        - [ ] `model`: Confirm specific model ID (e.g., `"text-embedding-3-small"`). Keep consistent.
        - [ ] `input`: Text string or array of strings. Note context window limits.
        - [ ] `dimensions` (Optional for `text-embedding-3`): Use only if needing shorter vectors; Qdrant *must* match. (Start with default).
        - [ ] Note API Limits & Costs.
        - [ ] Implement error handling (e.g., `try...catch` blocks).
    - [ ] Write a test function to generate an embedding for sample text and verify its dimensionality.

- [ ] **5. Data Loading Script (`load_profiles.ts`) & Qdrant Insertion Concepts:**
    - [ ] Create `load_profiles.ts` script.
    - [ ] Read profiles from `matching/playground/test_data/conference_data.json` (e.g., using `fs.readFile`).
    - [ ] Initialize Qdrant and OpenAI clients.
    - [ ] **Batching Strategy:** Implement processing in batches (e.g., 50-100) for OpenAI & Qdrant calls.
    - [ ] Iterate through batches:
        - [ ] Prepare batch of `input` strings.
        - [ ] Call OpenAI API once for the batch (`openai.embeddings.create({..., input: batch_texts })`).
        - [ ] **Qdrant Point Structure & `client.upsert()` Concepts:**
            - [ ] For each profile/embedding, construct a point object matching the Qdrant client's expected structure (typically `{ id: ..., vector: ..., payload: ... }`).
                - [ ] `id`: Unique ID (e.g., `user_id`, ensure it's a string or number compatible with Qdrant IDs).
                - [ ] `vector`: Embedding vector from OpenAI.
                - [ ] `payload`: Metadata object (e.g., `{ original_text: ..., user_id: ... }`). Include necessary filter/display data.
            - [ ] Call `client.upsert(collectionName, { points: batch_of_points, wait: false })`.
                - [ ] Consider using `wait: true` for simplicity initially or managing promises carefully if `wait: false`.
    - [ ] Implement error handling.

- [ ] **6. Run Data Loading:**
    - [ ] Compile (if needed) and execute `load_profiles.ts` (e.g., `npx ts-node load_profiles.ts`).
    - [ ] Verify loading (e.g., `client.count(collectionName)`, Qdrant UI).

- [ ] **7. Basic Querying & Exploration (`query_profiles.ts` or Interactive):**
    - [ ] Create `query_profiles.ts` or use Node REPL/interactive session.
    - [ ] Initialize clients.
    - [ ] Define sample query text.
    - [ ] Generate query vector (*using identical OpenAI model settings*).
    - [ ] **Qdrant Search (`client.search(...)`) Key Parameters:**
        - [ ] `collection_name`
        - [ ] `vector`: The query vector.
        - [ ] `limit`: Max number of results.
        - [ ] `filter` (Optional): Define filters on payload fields (e.g., `{ must: [{ key: ..., match: { value: ... } }] }`).
        - [ ] `with_payload: true`
        - [ ] `with_vector: false` (Usually).
    - [ ] Analyze results (IDs, scores, payloads). Experiment with filtering. Use Qdrant UI. 