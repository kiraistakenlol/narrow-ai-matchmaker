```json
{
  "raw_input": "<user’s free text or voice transcript>",

  /* 1 ─── Personal basics */
  "personal": {
    "name":             null,
    "headline":         null,
    "visiting_status":  null        // ← visiting_status.json  (TEMPORARY | LONG_TERM)
  },

  /* 2 ─── Global skill summary */
  "skills": {
    "hard": [
      { "skill": null, "level": null }   // ← skills_hard.json + skill_level.json
    ],
    "soft": [
      { "skill": null, "level": null }   // ← skills_soft.json + skill_level.json
    ]
  },

  /* 3 ─── Industries or domains */
  "industries": [],                      // ← industries_list.json

  /* 4 ─── Hobbies & values */
  "hobbies": [],                         // ← hobbies_list.json
 
 /* 5 ─── What they’re actually working on today */
  "roles": [
    {
      /* ─── 5.1 Who they work for ─── */
      "organization": {
        "org_type":   null,              // ← organization_types.json  
                                          //    (STARTUP | COMPANY | NONPROFIT | OPEN_SOURCE | SELF_EMPLOYED)
        "name":       null,
        "url":        null,
        "industries": []                 // ← industries_list.json
      },

      /* ─── 5.2 What they do there ─── */
      "category":     null,              // ← role_categories.json  
                                          //    (SOFTWARE_ENGINEER | DESIGNER | PRODUCT_MANAGER | MARKETER | OTHER)
      "sub_category": null,              // ← role_categories.json
                                          //    (FRONTEND_DEV | BACKEND_DEV | MOBILE_DEV | UX_UI | DATA_SCIENTIST | …)
      "title":        null,              // free text: “Co‑founder & CTO” or “Senior React Dev”
      "seniority":    null,              // ← seniority_levels.json  
                                          //    (INTERN | JUNIOR | MID | SENIOR | LEAD | C_LEVEL)

      /* ─── 5.3 How they’re engaged ─── */
      "engagement": {
        "type":       null,              // ← engagement_types.json  
                                          //    (EMPLOYMENT | CONTRACT | VOLUNTEER | ADVISORY)
        "commitment": null,              // ← commitment_types.json  
                                          //    (FULL_TIME | PART_TIME | AD_HOC)
        "work_mode":  null               // ← work_modes.json  
                                          //    (ON_SITE | REMOTE | HYBRID)
      },

      /* ─── 5.4 Skills & highlights ─── */
      "skills": {
        "hard": [ { "skill": null, "level": null } ],
        "soft": [ { "skill": null, "level": null } ]
      },
      "highlights": [],                  // free‑text bullets

      /* ─── 5.5 Is this current? ─── */
      "active":     true
    }
  ],

  /* 6 ─── This conference’s context */
  "event_context": {
    "event_id": "<TechConf2025>",
    "goals": {
      "looking_for": [],                // ← goal_tags.json
      "offering":   []                  // ← goal_tags.json
    }
  },

  /* 7 ─── Anything else the parser couldn’t slot above */
  "extra_notes":    null               // free‑text overflow
}

```