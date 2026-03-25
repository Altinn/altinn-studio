"""Prompt loader utility for managing system prompts"""
import re
import yaml
from pathlib import Path
from typing import Dict, Any, Optional
from shared.utils.logging_utils import get_logger
from shared.utils.langfuse_utils import is_langfuse_enabled, fetch_langfuse_prompt, get_raw_langfuse_prompt

log = get_logger(__name__)

PROMPTS_DIR = Path(__file__).parent


def _try_langfuse_prompt(prompt_name: str, variables: dict | None = None) -> Optional[str]:
    """
    Try to fetch a prompt from Langfuse, optionally substituting variables into {{placeholders}}.
    Returns None if Langfuse is disabled or unavailable.
    """
    try:
        if not is_langfuse_enabled():
            return None
        content = fetch_langfuse_prompt(prompt_name, variables)
        log.info(f"Loaded prompt '{prompt_name}' from Langfuse")
        return content
    except Exception as e:
        log.info(f"Langfuse prompt '{prompt_name}' not available, using local file")
        log.debug(e)
        return None


def load_prompt(prompt_name: str) -> Dict[str, Any]:
    """
    Load a prompt from a markdown file with YAML frontmatter.

    Args:
        prompt_name: Name of the prompt file (without .md extension)

    Returns:
        Dict with keys: content, role, version, name

    Example:
        >>> prompt = load_prompt("general_planning")
        >>> print(prompt["content"])
        >>> print(prompt["role"])  # "planner"
    """
    prompt_file = PROMPTS_DIR / f"{prompt_name}.md"

    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt file not found: {prompt_file}")

    content = prompt_file.read_text(encoding="utf-8")

    # Parse YAML frontmatter
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            frontmatter_text = parts[1].strip()
            prompt_content = parts[2].strip()

            try:
                metadata = yaml.safe_load(frontmatter_text) or {}
            except yaml.YAMLError as e:
                log.warning(f"Failed to parse YAML frontmatter in {prompt_name}.md: {e}")
                metadata = {}
        else:
            # No proper frontmatter, treat entire content as prompt
            metadata = {}
            prompt_content = content
    else:
        # No frontmatter at all
        metadata = {}
        prompt_content = content

    return {
        "content": prompt_content,
        "role": metadata.get("role", "assistant"),
        "version": metadata.get("version", "1.0"),
        "name": metadata.get("name", prompt_name),
    }


def get_prompt_content(prompt_name: str) -> str:
    """
    Get prompt content as a string.

    When Langfuse is enabled, tries to fetch from Langfuse first.
    Falls back to the local .md file if the prompt doesn't exist in Langfuse
    or Langfuse is unavailable. Check trace or debug to see where prompt was loaded from.

    Args:
        prompt_name: Name of the prompt (without .md extension)

    Returns:
        Prompt content as string
    """
    langfuse_content = _try_langfuse_prompt(prompt_name)
    if langfuse_content is not None:
        return langfuse_content

    return load_prompt(prompt_name)["content"]


def get_prompt_with_langfuse(prompt_name: str) -> tuple[str, object]:
    """Return ``(compiled_content, raw_langfuse_prompt)`` for use with LLM calls.

    Pass the raw prompt object to ``call_sync``/``call_async`` via
    ``langfuse_prompt=`` to link the generation to the prompt version in Langfuse.
    Falls back to the local file when Langfuse is unavailable (raw prompt is ``None``).
    """
    lf_prompt = get_raw_langfuse_prompt(prompt_name)
    if lf_prompt is not None:
        try:
            return lf_prompt.compile(), lf_prompt
        except Exception as e:
            log.warning(f"Failed to compile Langfuse prompt '{prompt_name}': {e}")
            # Fall through to local prompt
    return load_prompt(prompt_name)["content"], None


def _compile_template(content: str, variables: dict) -> str:
    """Substitute ``{{variable}}`` placeholders, matching Langfuse's compile() behaviour."""
    def _replace_variable(match: re.Match) -> str:
        variable_name = match.group(1).strip()
        if variable_name in variables:
            return str(variables[variable_name]) if variables[variable_name] is not None else ""
        raise ValueError(f"Missing required template variable: '{variable_name}'")

    return re.sub(r"\{\{(.+?)\}\}", _replace_variable, content)


def render_template(template_name: str, **variables) -> str:
    """
    Load and render a template with variable substitution.

    When Langfuse is enabled, tries to fetch from Langfuse
    first and falls back to the local template file.

    Args:
        template_name: Name of the template file (without .md extension)
        **variables: Keyword arguments to substitute into the template

    Returns:
        Rendered template string

    Example:
        >>> text = render_template("general_planning_user",
        ...                        user_goal="Add a field",
        ...                        planner_step="Step 1")
    """
    langfuse_content = _try_langfuse_prompt(template_name, variables)
    if langfuse_content is not None:
        return langfuse_content

    template_file = PROMPTS_DIR / "templates" / f"{template_name}.md"

    if not template_file.exists():
        raise FileNotFoundError(f"Template file not found: {template_file}")

    template_content = template_file.read_text(encoding="utf-8")
    return _compile_template(template_content, variables)
