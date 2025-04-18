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
