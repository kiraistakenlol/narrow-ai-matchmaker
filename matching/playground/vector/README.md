# Vector Database Exploration

This directory contains experiments and notes related to exploring the use of vector databases for the Narrow AI Matchmaker project.

## Goal

The primary goal is to evaluate different vector database technologies and techniques for:

*   Storing vector embeddings generated from user profiles (text only).
*   Performing efficient **matching** searches (finding complementary pairs, not just similarities) to find potential matches based on user goals, skills, and interests.
*   Understanding the trade-offs between different databases and indexing strategies.

## Contents

This directory may include:
*   Proof-of-concept code snippets for interacting with various vector databases.
*   Notes on setup, configuration, and performance.
*   Sample data and embedding generation scripts.
*   Comparisons between different approaches.

## Chosen Technology Stack

Based on initial research and project goals (performance, scalability, quality embeddings):

*   **Vector Database:** **Qdrant** will be used, leveraging its performance benefits and advanced filtering capabilities.
*   **Embedding Model:** Embeddings will be generated using the **OpenAI API**, targeting their latest high-performance models (e.g., `text-embedding-3-small` or `text-embedding-3-large`) for optimal semantic understanding.

## What are Vector Databases? (High-Level)

Vector databases are specialized systems designed to store, index, and search large collections of high-dimensional vectors, often called embeddings. These vectors are numerical representations of complex data like text, images, audio, or user preferences.

The core capability of a vector database is performing efficient **Approximate Nearest Neighbor (ANN)** searches. Instead of finding exact matches, they quickly find vectors that are "closest" or most similar to a given query vector in the high-dimensional space. This is crucial for tasks like:

*   **Semantic Search:** Finding documents or text passages based on meaning rather than just keywords.
*   **Recommendation Systems:** Suggesting items (products, articles, users) similar to ones a user has interacted with.
*   **Image/Audio Retrieval:** Finding visually or acoustically similar items.
*   **Anomaly Detection:** Identifying data points that are far from others in the vector space.

## Open-Source Options for Local Development

Several powerful open-source vector databases can be run locally for development and experimentation:

*   **ChromaDB:** ([https://www.trychroma.com/](https://www.trychroma.com/)) - Known for its developer-friendliness and ease of use, especially within Python applications. Great for getting started quickly.
*   **Qdrant:** ([https://qdrant.tech/](https://qdrant.tech/)) - Focuses on performance and offers advanced filtering capabilities alongside vector search. Written in Rust.
*   **Weaviate:** ([https://weaviate.io/](https://weaviate.io/)) - Provides semantic search features, supports multiple media types, and uses GraphQL for queries.
*   **Milvus:** ([https://milvus.io/](https://milvus.io/)) - A highly scalable, cloud-native vector database designed for large-scale production systems, but offers standalone modes for local use.

## Quick Comparison: Qdrant vs. ChromaDB

While both are excellent choices, here's a brief comparison based on common factors:

| Feature           | Qdrant                                       | ChromaDB                                        |
| ----------------- | -------------------------------------------- | ----------------------------------------------- |
| **Primary Focus** | Performance, Scalability, Advanced Filtering | Simplicity, Ease of Use, Python Integration   |
| **Language**      | Rust                                         | Python                                          |
| **Performance**   | Generally higher, especially with filters    | Good, optimized for Python workflows          |
| **Filtering**     | Advanced pre-filtering (during search)       | Post-filtering (after retrieving candidates)    |
| **Ease of Use**   | Moderate                                     | Very High                                       |
| **Integration**   | Good API, clients in various languages     | Excellent native Python, LangChain/LlamaIndex |
| **Use Case**      | Larger datasets, complex queries, speed req. | Rapid prototyping, smaller/medium datasets      |
| **Deployment**    | Standalone server, Docker                    | In-memory (default), client/server mode         |

## Filtering vs. Vector Search in ChromaDB

It's important to understand the distinction between vector search and metadata filtering in ChromaDB:

1.  **Vector Search (Approximate Nearest Neighbor - ANN Search):**
    *   **Purpose:** Finds items based on the *similarity* of their vector embeddings to a query vector.
    *   **Mechanism:** Uses ANN algorithms (like HNSW) to find vectors with the smallest distance (e.g., cosine similarity, L2 distance) in the high-dimensional space.
    *   **Outcome:** Returns items that are semantically close or similar in features to the query.

2.  **Metadata Filtering:**
    *   **Purpose:** Narrows down results based on *exact criteria* stored in metadata associated with each vector.
    *   **Mechanism:** You store key-value pairs (e.g., `{'category': 'tech', 'year': 2024}`) alongside vectors. Queries can include a `where` clause to specify conditions on these metadata fields (e.g., `where={"category": "tech"}`).
    *   **Outcome:** Only includes items that strictly match the specified metadata conditions.

**How ChromaDB Combines Them (Post-Filtering):**

ChromaDB primarily uses a **post-filtering** approach when you provide both a query vector and a `where` filter:

1.  **ANN Search:** It first performs the vector search to find an initial set of candidates based on vector similarity.
2.  **Filter Candidates:** It then applies the metadata filter (`where` clause) to this candidate set.
3.  **Final Results:** It returns the items that satisfy *both* the similarity search and the metadata filter criteria, up to the requested number of results (`n_results`).

This approach allows you to find items that are *similar* to your query (via vector search) *and* meet specific, factual requirements (via filtering).

## Filtering Comparison: Qdrant vs. ChromaDB

A key difference in how these databases handle filtering impacts performance:

*   **Qdrant: Pre-filtering / Filtering during Search**
    *   **Mechanism:** Qdrant can index metadata ("payload") and use these indexes to narrow down candidates *before* or *during* the vector search.
    *   **Benefit:** Often leads to better performance, especially with large datasets and selective filters, as it reduces the scope of the computationally intensive vector search.
    *   **How:** Leverages payload indexing for efficient filtering prior to or alongside the ANN search step.

*   **ChromaDB: Post-filtering**
    *   **Mechanism:** ChromaDB primarily performs the vector (ANN) search *first* to get similarity-based candidates, and *then* applies the metadata `where` filter to this smaller candidate list.
    *   **Benefit:** Conceptually simpler.
    *   **Limitation:** Can be less efficient if the initial vector search returns many candidates that are subsequently filtered out, as the ANN work was already done.

**When to Prefer Which:**

*   Consider **Qdrant** if you expect highly selective filters on large datasets where filtering performance is critical.
*   **ChromaDB** is often sufficient and easier to start with for smaller datasets or when filters are less complex or less selective.