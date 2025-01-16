namespace Altinn.Studio.Designer.Models;

public record Reference(ReferenceType Type, string LayoutSetName, string Id, string NewId = null);

public enum ReferenceType
{
    LayoutSet,
    Layout,
    Component
}
