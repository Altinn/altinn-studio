"""
MLflow tracing helpers for standardized span naming and output formatting.
"""
import json
import mlflow
from typing import Any, Dict, List, Optional, Union


def format_as_markdown(result):
    """Convert any result to markdown format"""
    if isinstance(result, dict):
        return f"```json\n{json.dumps(result, indent=2)}\n```"
    elif isinstance(result, list):
        return f"```json\n{json.dumps(result, indent=2)}\n```"
    else:
        return f"```\n{str(result)}\n```"


def is_json(text):
    """Check if a string is valid JSON"""
    if not isinstance(text, str):
        return False
    try:
        json.loads(text)
        return True
    except:
        return False


def capture_tool_output(span, result, success=True, errors=None):
    """Standardized output capture for any tool call"""
    span.set_outputs({
        "raw_output": result,
        "formats": {
            "text": str(result),
            "markdown": format_as_markdown(result),
            "json": result if isinstance(result, dict) else 
                   (json.loads(str(result)) if is_json(str(result)) else None)
        },
        "summary": {
            "success": success,
            "error_count": len(errors) if errors else 0,
            "output_size_bytes": len(str(result))
        }
    })


class SpanTypes:
    """Standard span types for consistent categorization"""
    PLANNING = "PLANNING"
    EXECUTION = "EXECUTION"
    VALIDATION = "VALIDATION"
    SYNTHESIS = "SYNTHESIS"
    LLM_CALL = "LLM_CALL"
    TOOL_CALL = "TOOL_CALL"
    GENERATION = "GENERATION"
    SYNC = "SYNC"


def create_tool_span(name, tool_name, input_params, file_path=None):
    """Create a standardized tool span with consistent attributes"""
    span = mlflow.start_span(name=name, span_type=SpanTypes.TOOL_CALL)
    span.set_attributes({
        "tool_name": tool_name,
        "file_path": file_path
    })
    span.set_inputs({
        "parameters": input_params,
        "parameter_count": len(input_params) if isinstance(input_params, dict) else 0
    })
    return span


def create_llm_span(name, prompt, model=None):
    """Create a standardized LLM call span with consistent attributes"""
    span = mlflow.start_span(name=name, span_type=SpanTypes.LLM_CALL)
    span.set_attributes({
        "model": model,
        "prompt_length": len(prompt) if isinstance(prompt, str) else 0
    })
    span.set_inputs({
        "prompt": prompt
    })
    return span
