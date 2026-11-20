"""Repository context that repo discovery returns."""

from typing import Literal

from pydantic import BaseModel, Field


class PlanContext(BaseModel):
    """Repository context discovered during scanning"""

    available_locales: list[str] = Field(default_factory=list)  # e.g., ["nb", "nn", "en"]
    required_locales: list[str] | None = None  # Override for required subset
    source_of_truth: Literal["json_schema"] = "json_schema"  # Always JSON schema for Altinn apps
    layout_pages: list[str] = Field(default_factory=list)  # Available layout files
    model_files: list[str] = Field(default_factory=list)  # Available model files
    resource_files: list[str] = Field(default_factory=list)  # All resource files
