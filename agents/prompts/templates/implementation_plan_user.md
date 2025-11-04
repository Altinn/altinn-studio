Based on the following Altinn documentation and context, create a detailed JSON implementation plan for: {user_goal}

DOCUMENTATION:
{documentation}

GENERAL PLAN:
{general_plan}

TOOL RESULTS SUMMARY:
{tool_summary}

REPOSITORY FACTS:
- Layouts: {layouts_count} files
- Models: {models_count} files  
- Resources: {resources_count} files

Create a JSON implementation plan with these fields:
{{{{
  "goal_analysis": "Brief analysis of what needs to be implemented",
  "components_needed": ["List of Altinn components to add/modify"],
  "data_model_changes": ["List of data model field additions"],
  "layout_changes": ["List of layout modifications needed"],
  "resource_changes": ["List of text resource additions"],
  "implementation_steps": [
    {{{{
      "step": "Brief description",
      "component": "What component this affects",
      "action": "What to do",
      "details": "Specific implementation details"
    }}}}
  ],
  "validation_requirements": ["List of things to validate"],
  "risks": ["Potential issues or edge cases"]
}}}}

Focus on the specific user goal and be concrete about file paths, component IDs, and data bindings. Use the documentation to understand Altinn best practices.
