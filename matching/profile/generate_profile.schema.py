import json
import os
from pathlib import Path
import uuid

# Define the directory paths
BASE_DIR = Path(__file__).parent
DICTIONARIES_DIR = BASE_DIR / "dictionaries"
OUTPUT_SCHEMA_PATH = BASE_DIR / "profile_schema.json"

# Dictionary mapping schema fields to their corresponding enum files
FIELD_TO_ENUM_FILE = {
    "visiting_status": "visiting_status.json",
    "org_type": "organization_types.json",
    "category": "role_categories.json",
    "sub_category": "role_categories.json",  # Note: Uses same file, will filter for sub-categories
    "seniority": "seniority_levels.json",
    "engagement.type": "engagement_types.json",
    "engagement.commitment": "engagement_commitments.json",
    "engagement.work_mode": "engagemen_work_modes.json",
    "industries": "industries_list.json",
    "hobbies": "hobbies_list.json",
    "goals.looking_for": "goal_tags.json",
    "goals.offering": "goal_tags.json",
    "skills.hard.skill": "skills_hard.json",
    "skills.soft.skill": "skills_soft.json",
    "roles.skills.hard.skill": "skills_hard.json",
    "roles.skills.soft.skill": "skills_soft.json",
    "skills.hard.level": "skill_level.json",
    "skills.soft.level": "skill_level.json",
    "roles.skills.hard.level": "skill_level.json",
    "roles.skills.soft.level": "skill_level.json"
}

def load_enum_values(filename):
    """Load enum values from a JSON file in the dictionaries directory."""
    file_path = DICTIONARIES_DIR / filename
    if not file_path.exists():
        print(f"Warning: Enum file {file_path} not found.")
        return []
    with open(file_path, 'r') as f:
        values = json.load(f)
        # Ensure values is a list
        if not isinstance(values, list):
            print(f"Warning: {file_path} does not contain a list. Found: {type(values)}")
            return []
        return values

def add_null_to_enums(enum_values):
    """Add null to enum values if not already present."""
    if None not in enum_values and "null" not in enum_values:
        return enum_values + [None]
    return enum_values

# Base JSON Schema structure
schema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
        "raw_input": {
            "type": "string",
            "description": "User's free text or voice transcript"
        },
        "personal": {
            "type": "object",
            "properties": {
                "name": {"type": ["string", "null"]},
                "headline": {"type": ["string", "null"]},
                "visiting_status": {
                    "enum": add_null_to_enums(load_enum_values(FIELD_TO_ENUM_FILE["visiting_status"]))
                }
            },
            "required": ["name", "headline", "visiting_status"],
            "additionalProperties": False
        },
        "skills": {
            "type": "object",
            "properties": {
                "hard": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "skill": {
                                "enum": add_null_to_enums(load_enum_values(FIELD_TO_ENUM_FILE["skills.hard.skill"]))
                            },
                            "level": {
                                "enum": add_null_to_enums(load_enum_values(FIELD_TO_ENUM_FILE["skills.hard.level"]))
                            }
                        },
                        "required": ["skill", "level"],
                        "additionalProperties": False
                    }
                },
                "soft": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "skill": {
                                "enum": add_null_to_enums(load_enum_values(FIELD_TO_ENUM_FILE["skills.soft.skill"]))
                            },
                            "level": {
                                "enum": add_null_to_enums(load_enum_values(FIELD_TO_ENUM_FILE["skills.soft.level"]))
                            }
                        },
                        "required": ["skill", "level"],
                        "additionalProperties": False
                    }
                }
            },
            "required": ["hard", "soft"],
            "additionalProperties": False
        },
        "industries": {
            "type": "array",
            "items": {"type": "string", "enum": load_enum_values(FIELD_TO_ENUM_FILE["industries"])}
        },
        "hobbies": {
            "type": "array",
            "items": {"type": "string", "enum": load_enum_values(FIELD_TO_ENUM_FILE["hobbies"])}
        },
        "roles": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "organization": {
                        "type": "object",
                        "properties": {
                            "org_type": {
                                "enum": add_null_to_enums(load_enum_values(FIELD_TO_ENUM_FILE["org_type"]))
                            },
                            "name": {"type": ["string", "null"]},
                            "url": {"type": ["string", "null"]},
                            "industries": {
                                "type": "array",
                                "items": {"type": "string", "enum": load_enum_values(FIELD_TO_ENUM_FILE["industries"])}
                            }
                        },
                        "required": ["org_type", "name", "url", "industries"],
                        "additionalProperties": False
                    },
                    "category": {
                        "enum": add_null_to_enums(load_enum_values(FIELD_TO_ENUM_FILE["category"]))
                    },
                    "sub_category": {
                        "enum": add_null_to_enums(load_enum_values(FIELD_TO_ENUM_FILE["sub_category"]))
                    },
                    "title": {"type": ["string", "null"]},
                    "seniority": {
                        "enum": add_null_to_enums(load_enum_values(FIELD_TO_ENUM_FILE["seniority"]))
                    },
                    "engagement": {
                        "type": "object",
                        "properties": {
                            "type": {
                                "enum": add_null_to_enums(load_enum_values(FIELD_TO_ENUM_FILE["engagement.type"]))
                            },
                            "commitment": {
                                "enum": add_null_to_enums(load_enum_values(FIELD_TO_ENUM_FILE["engagement.commitment"]))
                            },
                            "work_mode": {
                                "enum": add_null_to_enums(load_enum_values(FIELD_TO_ENUM_FILE["engagement.work_mode"]))
                            }
                        },
                        "required": ["type", "commitment", "work_mode"],
                        "additionalProperties": False
                    },
                    "skills": {
                        "type": "object",
                        "properties": {
                            "hard": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "skill": {
                                            "enum": add_null_to_enums(load_enum_values(FIELD_TO_ENUM_FILE["roles.skills.hard.skill"]))
                                        },
                                        "level": {
                                            "enum": add_null_to_enums(load_enum_values(FIELD_TO_ENUM_FILE["roles.skills.hard.level"]))
                                        }
                                    },
                                    "required": ["skill", "level"],
                                    "additionalProperties": False
                                }
                            },
                            "soft": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "skill": {
                                            "enum": add_null_to_enums(load_enum_values(FIELD_TO_ENUM_FILE["roles.skills.soft.skill"]))
                                        },
                                        "level": {
                                            "enum": add_null_to_enums(load_enum_values(FIELD_TO_ENUM_FILE["roles.skills.soft.level"]))
                                        }
                                    },
                                    "required": ["skill", "level"],
                                    "additionalProperties": False
                                }
                            }
                        },
                        "required": ["hard", "soft"],
                        "additionalProperties": False
                    },
                    "highlights": {
                        "type": "array",
                        "items": {"type": "string"}
                    },
                    "active": {"type": "boolean"}
                },
                "required": [
                    "organization",
                    "category",
                    "sub_category",
                    "title",
                    "seniority",
                    "engagement",
                    "skills",
                    "highlights",
                    "active"
                ],
                "additionalProperties": False
            }
        },
        "event_context": {
            "type": "object",
            "properties": {
                "event_id": {"type": "string"},
                "goals": {
                    "type": "object",
                    "properties": {
                        "looking_for": {
                            "type": "array",
                            "items": {"type": "string", "enum": load_enum_values(FIELD_TO_ENUM_FILE["goals.looking_for"])}
                        },
                        "offering": {
                            "type": "array",
                            "items": {"type": "string", "enum": load_enum_values(FIELD_TO_ENUM_FILE["goals.offering"])}
                        }
                    },
                    "required": ["looking_for", "offering"],
                    "additionalProperties": False
                }
            },
            "required": ["event_id", "goals"],
            "additionalProperties": False
        },
        "extra_notes": {"type": ["string", "null"]}
    },
    "required": [
        "raw_input",
        "personal",
        "skills",
        "industries",
        "hobbies",
        "roles",
        "event_context",
        "extra_notes"
    ],
    "additionalProperties": False
}

# Write the schema to a file
print(f"Attempting to write schema to: {OUTPUT_SCHEMA_PATH}")
with open(OUTPUT_SCHEMA_PATH, 'w') as f:
    json.dump(schema, f, indent=2)

print(f"JSON Schema generated and saved successfully at: {OUTPUT_SCHEMA_PATH}")