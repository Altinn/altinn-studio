using System.Text.Json;
using Altinn.App.Core.Models.Layout.Components.Base;

namespace Altinn.App.Core.Models.Layout.Components;

/// <summary>
/// This class represents multiple component types with children as List[string] that are not repeating.
/// </summary>
public sealed class NonRepeatingGroupComponent : ReferenceComponent
{
    /// <summary>
    /// Parser for NonRepeatingGroupComponent.
    /// </summary>
    public static NonRepeatingGroupComponent Parse(JsonElement componentElement, string pageId, string layoutId)
    {
        var id = ParseId(componentElement);
        var type = ParseType(componentElement);

        var children = ParseChildReferences(componentElement, layoutId, pageId);

        return new NonRepeatingGroupComponent()
        {
            // BaseComponent properties
            Id = id,
            Type = type,
            PageId = pageId,
            LayoutId = layoutId,
            Required = ParseRequiredExpression(componentElement),
            ReadOnly = ParseReadOnlyExpression(componentElement),
            Hidden = ParseHiddenExpression(componentElement),
            RemoveWhenHidden = ParseRemoveWhenHiddenExpression(componentElement),
            DataModelBindings = ParseDataModelBindings(componentElement),
            TextResourceBindings = ParseTextResourceBindings(componentElement),
            // GridComponent properties
            ChildReferences = children,
        };
    }
}
