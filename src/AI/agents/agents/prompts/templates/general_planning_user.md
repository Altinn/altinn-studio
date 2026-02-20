USER GOAL:
{user_goal}

CURRENT PLAN STEP (if any):
{planner_step}

FORM SPECIFICATION (if available):
{form_spec}

If a FORM SPECIFICATION is provided above, it is the authoritative source of truth for the form structure. Use it to:

1. Determine the exact number of pages/layout files to create
2. Know exactly which fields go on which page
3. Use the exact field labels, types, and descriptions specified

Return JSON with:
{{
  "goal_summary": "one paragraph",
  "key_requirements": ["..."],
  "risks": ["..."],
  "suggested_subtasks": ["..."],
  "notes_for_team": "guidance for other agents"
}}
