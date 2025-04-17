# Narrow AI Matchmaker

A platform leveraging AI and LLMs to facilitate connections between people based on free-form input like audio and text.

## Documentation

*   [Project Idea and Roadmap](idea.md): Detailed concepts, MVP definition, and initial test plans.
*   [Technical Overview](technical_overview.md): High-level technical design.
*   [Notes & TODOs](NOTES.md): Miscellaneous ideas and tasks.
*   Matching Deep Dive:
    *   [Detailed Matching Process](matching/detailed_matching_process.md)
    *   [Matching Strategies and Challenges](matching/matching_strategies_and_challenges.md)
    *   [Vector Database Fundamentals](matching/vector_database_fundamentals.md)
    *   [Vector vs Graph Databases](matching/vector_vs_graph_databases.md)
    *   [Example Match Scenarios](matching/example_match_scenarios.md)

## Setup

1.  **Environment Variables:** Configuration, including the required `ANTHROPIC_API_KEY`, is managed via an `.env` file in the project root. 
    *   **Important:** Ensure `.env` is added to your `.gitignore` file.

(Add further setup steps like dependencies installation later)