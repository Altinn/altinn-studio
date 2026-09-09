"""Experiment identity for a benchmark run.

A trace declares its own dataset-run membership through OTel attributes on its
root span, so the caller that owns the dataset passes this in at session start.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

EXPERIMENT_ID = "langfuse.experiment.id"
EXPERIMENT_NAME = "langfuse.experiment.name"
EXPERIMENT_DATASET_ID = "langfuse.experiment.dataset.id"
EXPERIMENT_DESCRIPTION = "langfuse.experiment.description"
EXPERIMENT_ITEM_ID = "langfuse.experiment.item.id"
EXPERIMENT_ITEM_ROOT_OBSERVATION_ID = "langfuse.experiment.item.root_observation_id"


class ExperimentContext(BaseModel):
    """One dataset item, run once."""

    model_config = ConfigDict(populate_by_name=True)

    experiment_id: str = Field(alias="experimentId")
    experiment_name: str = Field(alias="experimentName")
    dataset_id: str = Field(alias="datasetId")
    item_id: str = Field(alias="itemId")
    description: Optional[str] = None

    def span_attributes(self, root_observation_id: str) -> dict[str, str]:
        """`root_observation_id` must be the root span's own id, per the spec."""
        attributes = {
            EXPERIMENT_ID: self.experiment_id,
            EXPERIMENT_NAME: self.experiment_name,
            EXPERIMENT_DATASET_ID: self.dataset_id,
            EXPERIMENT_ITEM_ID: self.item_id,
            EXPERIMENT_ITEM_ROOT_OBSERVATION_ID: root_observation_id,
        }
        if self.description:
            attributes[EXPERIMENT_DESCRIPTION] = self.description
        return attributes
