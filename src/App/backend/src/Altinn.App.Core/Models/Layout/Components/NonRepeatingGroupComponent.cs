using System.Text.Json;
using Altinn.App.Core.Models.Layout.Components.Base;

namespace Altinn.App.Core.Models.Layout.Components;

/// <summary>
/// This class represents multiple component types with children as List[string] that are not repeating.
/// </summary>
public sealed class NonRepeatingGroupComponent : ReferenceComponent
{
    /// <summary>
    /// The ids of the components this component claims as children.
    /// </summary>
    internal static IEnumerable<string> ClaimChildren(JsonElement componentElement) =>
        ParseChildReferences(componentElement);

    /// <summary>
    /// Parser for NonRepeatingGroupComponent.
    /// </summary>
    internal static NonRepeatingGroupComponent Parse(
        JsonElement componentElement,
        string pageId,
        string layoutId,
        IReadOnlyList<BaseLayoutComponent> children
    )
    {
        return new NonRepeatingGroupComponent()
        {
            // BaseComponent properties
            Id = ParseId(componentElement),
            Type = ParseType(componentElement),
            PageId = pageId,
            LayoutId = layoutId,
            Required = ParseRequiredExpression(componentElement),
            ReadOnly = ParseReadOnlyExpression(componentElement),
            Hidden = ParseHiddenExpression(componentElement),
            RemoveWhenHidden = ParseRemoveWhenHiddenExpression(componentElement),
            DataModelBindings = ParseDataModelBindings(componentElement),
            TextResourceBindings = ParseTextResourceBindings(componentElement),
            // ReferenceComponent properties
            Children = children,
        };
    }
}
