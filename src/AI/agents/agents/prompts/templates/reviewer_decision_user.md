FINAL REVIEW:

ORIGINAL GOAL: {user_goal}
IMPLEMENTED STEP: {plan_context}
CHANGED FILES: {changed_files}
TESTS PASSED: {tests_passed}
VERIFICATION NOTES: {verify_notes}

DECISION GUIDELINES:
- COMMIT if: All validations passed, tests passed, and changes appear to implement the goal
- REVERT only if: There are clear validation errors, tests failed, or changes are clearly wrong/broken

IMPORTANT: When everything looks good (validations passed, tests passed), you should COMMIT the changes.
The system has already validated the changes extensively - if all checks pass, the changes are ready to commit.

CRITICAL: If committing, you MUST provide a detailed, specific commit message that clearly describes what was implemented.
The commit message should be professional and descriptive, explaining the actual changes made.

GOOD examples:
- "feat: add input validation for payment details"
- "fix: correct tab navigation order on main form"
- "chore: update localization resources for new fields"

BAD examples (do not use these):
- "Altinity automated change"
- "Implement changes"
- "Update files"

Return JSON with commit_message field ALWAYS filled with a descriptive message:
{{{{
  "decision": "commit|revert",
  "commit_message": "REQUIRED: Detailed description of what was actually implemented",
  "reasoning": "explanation of decision"
}}}}
