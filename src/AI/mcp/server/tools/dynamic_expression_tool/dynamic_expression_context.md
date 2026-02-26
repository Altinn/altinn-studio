# ALTINN DYNAMIC EXPRESSIONS USAGE GUIDELINES

## PURPOSE AND SCOPE

This tool is **EXCLUSIVELY** for adding dynamic expressions to **EXISTING** layout files. The primary purpose is to:

1. Add conditional logic to components in layout files that already exist
2. Modify existing expressions in layout files
3. Implement validation rules using expressions in existing components

**DO NOT create new layout files unless explicitly requested by the user.**

## CRITICAL REQUIREMENTS

When implementing dynamic expressions in Altinn applications, you **MUST**:

1. **Always check what conditionals are supported for the data type** (string, integer, boolean, etc.) before implementing any expression.
2. **Do not implement a dynamic expression if you are unsure if it is supported for the data type**. When in doubt, refer to the official documentation or avoid using the expression.
3. **Strictly follow the coding style shown in the documentation examples**. Do not invent alternative syntax or approaches.
4. **Only modify the specific parts of the layout file that require expressions**. Do not restructure or reformat other parts of the file.

## COMMON PITFALLS TO AVOID

1. **Type mismatch**: Ensure the operation is valid for the data type
2. **Missing quotes**: String literals must always be in quotes
3. **Invalid data paths**: Verify that the data model binding path exists
4. **Case sensitivity**: Function names and data paths are case-sensitive
5. **Nested expressions**: When using nested expressions, ensure each function's return type matches the expected input type of the parent function
6. **Using invalid fields in expressions**: Verify that functional fields such as "dataModelBinding" or "onClickAction" are only used in they are supported. 

## TOOL DEPENDENCIES

1. **ALWAYS use the data model tool** to create or modify data model files
2. **NEVER manually edit data model files** (.cs, .schema.json, .xsd) directly without using the data model tool
3. **Dynamic expressions must reference valid data model fields** that exist in the data model
4. **NEVER manually edit resource files** (.json) directly without using the resource tool
5. **NEVER manually add or make changes to layout component files** (.json) directly without using searching for relevant components in the layout components tool. 