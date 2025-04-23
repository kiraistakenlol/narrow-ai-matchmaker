/**
 * Represents a single matching scenario.
 */
export interface MatchScenario {
  id: string;
  scenario: string;
  match_description: string;
}

/**
 * Represents the structure of the match_scenarios.json file,
 * where keys are category names and values are arrays of scenarios.
 */
export type MatchScenarioCategories = Record<string, MatchScenario[]>; 