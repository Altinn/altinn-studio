"""Decision models: classifiers that answer questions about an input with probabilities. They are not LLMs."""

from .gates import Judgment, judge_request

__all__ = ["Judgment", "judge_request"]
