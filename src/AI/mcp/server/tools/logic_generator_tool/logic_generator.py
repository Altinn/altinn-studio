"""Tool to generate logic code using the Altinn pipeline."""
from codegen import run_pipeline
from server.tools import register_tool
from mcp.types import ToolAnnotations


@register_tool(
    name="logic_generator_tool",
    description="""
This tool generates C# logic code for Altinn Studio applications based on natural language descriptions.
Use this tool when you need to implement validation logic or other backend functionality in an Altinn application.

The tool processes your description and generates C# code files that follow Altinn Studio conventions and best practices.

Provide a clear description of the logic you need, including:
- The purpose of the logic (validation, data fetches, etc.)
- Any specific rules or conditions that should be implemented
- Which form fields or data model elements the logic should interact with

The generated code will be ready to integrate into your Altinn Studio application.
""",
    title="Logic Generator Tool",
    annotations=ToolAnnotations(
        title="Logic Generator Tool",
        readOnlyHint=False,
        idempotentHint=False
    )
)
def logic_generator_tool(query: str) -> dict:
    """Generate logic code for a user query using the Altinn Studio pipeline."""
    try:
        result = run_pipeline(query)
        if result["status"] != "success":
            return {"status": "error", "message": result.get("message", "Unknown error")}

        files = result.get("files", [])
        if not files:
            return {"status": "error", "message": "No files generated."}

        generated_files = []
        for file_info in files:
            path = file_info.get("path", "unknown")
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()

                relative_path = path.split("/App/")[-1] if "/App/" in path else path.split("/")[-1]
                file_data = {
                    "path": relative_path,
                    "content": content,
                    "size": len(content),
                    "lines": content.count("\n") + 1,
                }
                generated_files.append(file_data)
            except Exception as file_error:
                generated_files.append({"path": path, "error": str(file_error)})

        return {"status": "success", "message": f"Generated {len(generated_files)} files", "files": generated_files}
    except Exception as e:
        return {"status": "error", "message": f"Server error: {str(e)}"}