using System.Collections.Immutable;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Models.Layout.Components.Base;

namespace Altinn.App.Core.Models.Layout.Components;

/// <summary>
/// This class represents multiple component types
/// </summary>
public sealed class TabsComponent : ReferenceComponent
{
    /// <summary>
    /// The ids of the components this component claims as children.
    /// </summary>
    internal static IEnumerable<string> ClaimChildren(JsonElement componentElement) =>
        ParseTabs(componentElement).SelectMany(t => t.Children);

    /// <summary>
    /// Parser for TabsComponent
    /// </summary>
    internal static TabsComponent Parse(
        JsonElement componentElement,
        string pageId,
        string layoutId,
        IReadOnlyList<BaseLayoutComponent> children
    )
    {
        return new TabsComponent()
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
            // TabsComponent properties
            Tabs = ParseTabs(componentElement),
            Children = children,
        };
    }

    private static ImmutableArray<TabsConfig> ParseTabs(JsonElement componentElement)
    {
        if (
            !componentElement.TryGetProperty("tabs", out JsonElement tabsElement)
            || tabsElement.ValueKind != JsonValueKind.Array
        )
        {
            throw new JsonException(
                $"{ParseType(componentElement)} component must have a \"tabs\" property of type array."
            );
        }

        return tabsElement.Deserialize<ImmutableArray<TabsConfig>>();
    }

    /// <summary>
    /// Configuration for the tabs in the TabsComponent.
    /// </summary>
    public required IReadOnlyList<TabsConfig> Tabs { get; init; }
}

/// <summary>
/// Configuration for a single tab in a TabsComponent.
/// </summary>
public sealed class TabsConfig
{
    /// <summary>
    /// Create the configuration for a tab
    /// </summary>
    [JsonConstructor]
    public TabsConfig(ImmutableArray<string> children)
    {
        Children = children.IsDefault ? [] : children;
    }

    /// <summary>
    /// List of child component IDs that belong to this tab.
    /// </summary>
    [JsonPropertyName("children")]
    public ImmutableArray<string> Children { get; }
}
