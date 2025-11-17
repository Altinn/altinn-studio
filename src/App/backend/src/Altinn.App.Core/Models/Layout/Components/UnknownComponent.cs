using System.Text.Json;

namespace Altinn.App.Core.Models.Layout.Components;

/// <summary>
/// Represents an unknown or unrecognized component in a layout. UnknownComponent serves as a placeholder
/// for components that do not match any predefined or supported type.
/// </summary>
internal sealed class UnknownComponent : Base.NoReferenceComponent
{
    /// <summary>
    /// Parser for UnknownComponent
    /// </summary>
    public static UnknownComponent Parse(JsonElement componentElement, string pageId, string layoutId)
    {
        return new UnknownComponent()
        {
            // BaseComponent properties
            Id = ParseId(componentElement),
            PageId = pageId,
            LayoutId = layoutId,
            Type = ParseType(componentElement),
            Required = ParseRequiredExpression(componentElement),
            ReadOnly = ParseReadOnlyExpression(componentElement),
            Hidden = ParseHiddenExpression(componentElement),
            RemoveWhenHidden = ParseRemoveWhenHiddenExpression(componentElement),
            DataModelBindings = ParseDataModelBindings(componentElement),
            TextResourceBindings = ParseTextResourceBindings(componentElement),
        };
    }
}
