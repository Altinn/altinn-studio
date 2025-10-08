"""Datamodel sync tool for Altinn Studio.

This tool replicates Altinn Studio's exact datamodel generation capabilities,
converting JSON Schema files to XSD and C# using the same logic as the Designer.
"""

from .datamodel_sync_tool import datamodel_sync, DatamodelGenerator

__all__ = ['datamodel_sync', 'DatamodelGenerator']
