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
    /// Parser for TabsComponent
    /// </summary>
    public static TabsComponent Parse(JsonElement componentElement, string pageId, string layoutId)
    {
        var tabs = ParseTabs(componentElement, pageId, layoutId);
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
            Tabs = tabs,
            ChildReferences = tabs.SelectMany(t => t.Children ?? []).ToList(),
        };
    }

    private static List<TabsConfig> ParseTabs(JsonElement componentElement, string pageId, string layoutId)
    {
        if (!componentElement.TryGetProperty("tabs", out JsonElement tabsElement))
        {
            var type = ParseType(componentElement);
            throw new JsonException($"{type} component on {layoutId}.{pageId} must have a \"tabs\" property.");
        }

        return tabsElement.Deserialize<List<TabsConfig>>()
            ?? throw new JsonException("Failed to deserialize tabs in TabsComponent.");
    }

    /// <summary>
    /// Configuration for the tabs in the TabsComponent.
    /// </summary>
    public required IReadOnlyCollection<TabsConfig> Tabs { get; init; }
}

/// <summary>
/// Configuration for a single tab in a TabsComponent.
/// </summary>
public sealed class TabsConfig
{
    /// <summary>
    /// List of child component IDs that belong to this tab.
    /// </summary>
    [JsonPropertyName("children")]
    public List<string>? Children { get; init; }
}
