import json
import os
from pathlib import Path

# Define the directory paths
BASE_DIR = Path(__file__).parent
DICTIONARIES_DIR = BASE_DIR / "dictionaries"
OUTPUT_SCHEMA_PATH = BASE_DIR / "profile_schema.json"

# Dictionary mapping schema fields to their corresponding enum files and keys
FIELD_TO_ENUM_FILE = {
    "visiting_status": {"file": "visiting_status.json"},
    "org_type": {"file": "organization_types.json"},
    "category": {"file": "role_categories.json", "type": "categories"},
    "sub_category": {"file": "role_categories.json", "type": "sub_categories"},
    "seniority": {"file": "seniority_levels.json"},
    "engagement.type": {"file": "engagement_types.json"},
    "engagement.commitment": {"file": "engagement_commitments.json"},
    "engagement.work_mode": {"file": "engagemen_work_modes.json"},
    "industries": {"file": "industries_list.json"},
    "hobbies": {"file": "hobbies_list.json"},
    "goals.looking_for": {"file": "goal_tags.json"},
    "goals.offering": {"file": "goal_tags.json"},
    "skills.hard.skill": {"file": "skills_hard.json"},
    "skills.soft.skill": {"file": "skills_soft.json"},
    "roles.skills.hard.skill": {"file": "skills_hard.json"},
    "roles.skills.soft.skill": {"file": "skills_soft.json"},
    "skills.hard.level": {"file": "skill_level.json"},
    "skills.soft.level": {"file": "skill_level.json"},
    "roles.skills.hard.level": {"file": "skill_level.json"},
    "roles.skills.soft.level": {"file": "skill_level.json"}
}

def load_enum_values(field_key):
    """Load enum values from a JSON file in the dictionaries directory."""
    config = FIELD_TO_ENUM_FILE[field_key]
    filename = config["file"]
    file_path = DICTIONARIES_DIR / filename
    if not file_path.exists():
        print(f"Warning: Enum file {file_path} not found.")
        return []
    
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    if filename == "role_categories.json":
        if config.get("type") == "categories":
            # Return top-level keys for categories
            values = list(data.keys())
        elif config.get("type") == "sub_categories":
            # Flatten all sub-category values
            values = []
            for category_values in data.values():
                if isinstance(category_values, list):
                    values.extend(category_values)
            values = sorted(set(values))  # Remove duplicates and sort
        else:
            print(f"Warning: Invalid type for {filename} in field {field_key}")
            return []
    else:
        # For other files, expect a flat list
        if not isinstance(data, list):
            print(f"Warning: {file_path} does not contain a list. Found: {type(data)}")
            return []
        values = data
    
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
                    "enum": add_null_to_enums(load_enum_values("visiting_status"))
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
                                "enum": add_null_to_enums(load_enum_values("skills.hard.skill"))
                            },
                            "level": {
                                "enum": add_null_to_enums(load_enum_values("skills.hard.level"))
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
                                "enum": add_null_to_enums(load_enum_values("skills.soft.skill"))
                            },
                            "level": {
                                "enum": add_null_to_enums(load_enum_values("skills.soft.level"))
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
            "items": {"type": "string", "enum": load_enum_values("industries")}
        },
        "hobbies": {
            "type": "array",
            "items": {"type": "string", "enum": load_enum_values("hobbies")}
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
                                "enum": add_null_to_enums(load_enum_values("org_type"))
                            },
                            "name": {"type": ["string", "null"]},
                            "url": {"type": ["string", "null"]},
                            "industries": {
                                "type": "array",
                                "items": {"type": "string", "enum": load_enum_values("industries")}
                            }
                        },
                        "required": ["org_type", "name", "url", "industries"],
                        "additionalProperties": False
                    },
                    "category": {
                        "enum": add_null_to_enums(load_enum_values("category"))
                    },
                    "sub_category": {
                        "enum": add_null_to_enums(load_enum_values("sub_category"))
                    },
                    "title": {"type": ["string", "null"]},
                    "seniority": {
                        "enum": add_null_to_enums(load_enum_values("seniority"))
                    },
                    "engagement": {
                        "type": "object",
                        "properties": {
                            "type": {
                                "enum": add_null_to_enums(load_enum_values("engagement.type"))
                            },
                            "commitment": {
                                "enum": add_null_to_enums(load_enum_values("engagement.commitment"))
                            },
                            "work_mode": {
                                "enum": add_null_to_enums(load_enum_values("engagement.work_mode"))
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
                                            "enum": add_null_to_enums(load_enum_values("roles.skills.hard.skill"))
                                        },
                                        "level": {
                                            "enum": add_null_to_enums(load_enum_values("roles.skills.hard.level"))
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
                                            "enum": add_null_to_enums(load_enum_values("roles.skills.soft.skill"))
                                        },
                                        "level": {
                                            "enum": add_null_to_enums(load_enum_values("roles.skills.soft.level"))
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