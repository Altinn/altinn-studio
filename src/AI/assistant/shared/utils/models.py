"""What a model's name says about the requests it accepts."""

from __future__ import annotations

import re

_GPT_GENERATION = re.compile(r"gpt-(\d+)")


def is_reasoning_model(model: str | None) -> bool:
    """o1, o3 and every gpt generation from 5 on. They take `max_completion_tokens` and a reasoning effort, and reject
    `temperature`, so a wrong answer here makes every call fail with 400."""
    if not model:
        return False
    name = model.lower()
    if name.startswith(("o1", "o3")):
        return True
    generation = _GPT_GENERATION.match(name)
    return generation is not None and int(generation.group(1)) >= 5
