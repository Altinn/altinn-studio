"""Model metadata classes matching Altinn Studio's ModelMetadata structure."""

from dataclasses import dataclass, field

from .enums import BaseValueType, ElementType


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
    ParentElement: str | None = None
    XsdValueType: BaseValueType | None = None
    XPath: str = ""
    JsonSchemaPointer: str = ""
    MinOccurs: int = 0
    MaxOccurs: int = 1
    Type: ElementType = ElementType.FIELD
    Restrictions: dict[str, Restriction] = field(default_factory=dict)
    FixedValue: str | None = None
    DataBindingName: str | None = None
    DisplayString: str = ""
    IsTagContent: bool = False
    Nillable: bool = False
    OrderOblivious: bool = False
    Texts: dict[str, str] = field(default_factory=dict)
    IsReadOnly: bool = False


@dataclass
class ModelMetadata:
    """Container for all element metadata in the model.

    Matches Altinn.Studio.DataModeling.Metamodel.ModelMetadata
    """

    Elements: dict[str, ElementMetadata] = field(default_factory=dict)
    TargetNamespace: str | None = None

    def get_root_element(self) -> ElementMetadata:
        """Get the root element (element with no parent)."""
        for element in self.Elements.values():
            if element.ParentElement is None:
                return element
        raise ValueError("No root element found in model metadata")
