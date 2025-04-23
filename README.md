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

1.  **Environment Variables:** Core application configuration might use a root `.env` file.
    *   See specific component READMEs (like the Test Data Generator) for component-specific `.env` requirements.
    *   **Important:** Ensure relevant `.env` files are added to your `.gitignore` file.

## Test Data Generation

A script for generating synthetic test data using the Anthropic API is located in `matching/playground/test_data/generator/`. See the [Test Data Generator README](matching/playground/test_data/generator/README.md) for setup and usage instructions.

## Testing Methodology (Matching System)

The evaluation of the matching system relies on predefined scenarios, each designed to test specific matching capabilities.

1.  **Base Set:** A pre-generated set of N profiles representing 'non-descript' or generic event participants. This set forms the background noise against which specific matches are tested.
2.  **Scenario Bundles:** Each test scenario has a corresponding bundle of specific profiles ("signal" profiles) designed to interact in predictable ways (e.g., expected matches).
3.  **Test Execution:**
    *   **Pre-condition:** The Base Set profiles are assumed to be already generated and embedded within the vector database.
    *   **Scenario Setup:** For a given scenario, the specific profiles from its bundle are embedded into the vector database.
    *   **Query & Evaluation:** Queries are performed using one or more signal profiles from the bundle to find the top K matches.
    *   **Assertion:** The returned match results are compared against the expected results defined for that specific scenario.
    *   **Metrics:** Performance metrics (e.g., precision, recall, MRR) are calculated based on the comparison.

This approach allows for isolated testing of different matching situations by combining a consistent background dataset with scenario-specific signal profiles.