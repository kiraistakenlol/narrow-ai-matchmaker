# Documentation & Schema TODOs

This file tracks the necessary diagrams, schemas, and documentation to define before implementation.

- [ ] **1. Data Model / Database Schema (ERD):**
    *   **Goal:** Define core entities (`User`, `Profile`, `Skill`, `Event`, `EventParticipation`, `Match`, etc.) and their relationships.
    *   **Why:** Clarifies data storage, retrieval, and structure, essential for backend and API design.
    *   **Output:** Entity-Relationship Diagram (visual) and/or textual definitions of tables/collections.

- [ ] **2. API Specification (e.g., OpenAPI/Swagger):**
    *   **Goal:** Define the contract between the client interface and the backend.
    *   **Why:** Specifies endpoints, request/response formats (JSON schemas) needed to support user stories.
    *   **Output:** OpenAPI (Swagger) YAML/JSON file or structured Markdown documentation.

- [ ] **3. Data Flow / Sequence Diagrams (for key flows):**
    *   **Goal:** Visualize how data moves through the system for key user stories (e.g., profile creation from audio, match generation).
    *   **Why:** Helps understand module interactions and refine workflows.
    *   **Output:** Visual diagrams (DFD for high-level, Sequence Diagrams for detailed interactions).

## Recommended Order

- [ ] 1. Data Model / Database Schema
- [ ] 2. API Specification
- [ ] 3. Data Flow / Sequence Diagrams 