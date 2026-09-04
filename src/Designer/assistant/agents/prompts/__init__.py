"""System prompts for the Altinn agent workflow"""
from .loader import load_prompt, get_prompt_content, get_prompt_with_langfuse, render_template

__all__ = ["load_prompt", "get_prompt_content", "get_prompt_with_langfuse", "render_template"]
