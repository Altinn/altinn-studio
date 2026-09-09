"""JSON Schema → metamodel → XSD/C# generation (Altinn Studio parity)."""

from .sync import DatamodelGenerator, datamodel_sync

__all__ = ["DatamodelGenerator", "datamodel_sync"]
