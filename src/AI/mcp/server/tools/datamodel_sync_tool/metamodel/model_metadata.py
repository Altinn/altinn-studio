"""Model metadata classes matching Altinn Studio's ModelMetadata structure."""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from .enums import ElementType, BaseValueType


@dataclass
class Restriction:
    """Represents a restriction on an element."""
    value: str
    
    def __repr__(self):
        return self.value


@dataclass
class ElementMetadata:
    """Metadata for a single element in the model.
    
    Matches Altinn.Studio.DataModeling.Metamodel.ElementMetadata
    """
    ID: str
    Name: str
    XName: str
    TypeName: str
    ParentElement: Optional[str] = None
    XsdValueType: Optional[BaseValueType] = None
    XPath: str = ""
    JsonSchemaPointer: str = ""
    MinOccurs: int = 0
    MaxOccurs: int = 1
    Type: ElementType = ElementType.FIELD
    Restrictions: Dict[str, Restriction] = field(default_factory=dict)
    FixedValue: Optional[str] = None
    DataBindingName: Optional[str] = None
    DisplayString: str = ""
    IsTagContent: bool = False
    Nillable: bool = False
    OrderOblivious: bool = False
    Texts: Dict[str, str] = field(default_factory=dict)
    IsReadOnly: bool = False


@dataclass
class ModelMetadata:
    """Container for all element metadata in the model.
    
    Matches Altinn.Studio.DataModeling.Metamodel.ModelMetadata
    """
    Elements: Dict[str, ElementMetadata] = field(default_factory=dict)
    TargetNamespace: Optional[str] = None
    
    def get_root_element(self) -> ElementMetadata:
        """Get the root element (element with no parent)."""
        for element in self.Elements.values():
            if element.ParentElement is None:
                return element
        raise ValueError("No root element found in model metadata")
