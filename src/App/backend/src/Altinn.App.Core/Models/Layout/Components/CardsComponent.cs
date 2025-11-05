using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Models.Layout.Components.Base;

namespace Altinn.App.Core.Models.Layout.Components;

/// <summary>
/// This class represents a component that references other components and displays them in a card-like format.
/// </summary>
public sealed class CardsComponent : SimpleReferenceComponent
{
    /// <summary>
    /// Parser for CardsComponent from a JsonElement
    /// </summary>
    public static CardsComponent Parse(JsonElement componentElement, string pageId, string layoutId)
    {
        var id = ParseId(componentElement);
        var type = ParseType(componentElement);
        if (!componentElement.TryGetProperty("cards", out JsonElement cardsElement))
        {
            throw new JsonException(
                $"Component {layoutId}.{pageId}.{id} of type {type} component must have a \"cards\" property."
            );
        }

        var cards =
            cardsElement.Deserialize<List<CardsConfig>>()
            ?? throw new JsonException("Failed to deserialize cards in CardsComponent.");

        return new CardsComponent()
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
            // CardsComponent properties
            Cards = cards,
            ChildReferences = cards.SelectMany(t => t.Children ?? []).ToList(),
        };
    }

    /// <summary>
    /// Configuration for the cards in the CardsComponent.
    /// </summary>
    public required IReadOnlyCollection<CardsConfig> Cards { get; init; }
}

/// <summary>
/// Configuration for a single tab in a CardsComponent.
/// </summary>
public sealed class CardsConfig
{
    /// <summary>
    /// List of child component IDs that belong to this tab.
    /// </summary>
    [JsonPropertyName("children")]
    public List<string>? Children { get; init; }
}
