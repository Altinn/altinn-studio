"""Bounded-concurrency primitives for workflow and chat execution."""

from .concurrency import acquire_workflow_slot

__all__ = ["acquire_workflow_slot"]
