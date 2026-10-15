using System.Collections.Immutable;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Models.Layout.Components.Base;

namespace Altinn.App.Core.Models.Layout.Components;

/// <summary>
/// This class represents a component that references other components and displays them in a card-like format.
/// </summary>
public sealed class CardsComponent : ReferenceComponent
{
    /// <summary>
    /// The ids of the components this component claims as children.
    /// </summary>
    internal static IEnumerable<string> ClaimChildren(JsonElement componentElement) =>
        ParseCards(componentElement).SelectMany(t => t.Children);

    /// <summary>
    /// Parser for CardsComponent
    /// </summary>
    internal static CardsComponent Parse(
        JsonElement componentElement,
        string pageId,
        string layoutId,
        IReadOnlyList<BaseLayoutComponent> children
    )
    {
        return new CardsComponent()
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
            // CardsComponent properties
            Cards = ParseCards(componentElement),
            Children = children,
        };
    }

    private static ImmutableArray<CardsConfig> ParseCards(JsonElement componentElement)
    {
        if (
            !componentElement.TryGetProperty("cards", out JsonElement cardsElement)
            || cardsElement.ValueKind != JsonValueKind.Array
        )
        {
            throw new JsonException(
                $"{ParseType(componentElement)} component must have a \"cards\" property of type array."
            );
        }

        return cardsElement.Deserialize<ImmutableArray<CardsConfig>>();
    }

    /// <summary>
    /// Configuration for the cards in the CardsComponent.
    /// </summary>
    public required IReadOnlyList<CardsConfig> Cards { get; init; }
}

/// <summary>
/// Configuration for a single card in a CardsComponent.
/// </summary>
public sealed class CardsConfig
{
    /// <summary>
    /// Create the configuration for a card
    /// </summary>
    [JsonConstructor]
    public CardsConfig(IReadOnlyList<string>? children)
    {
        Children = children?.ToImmutableArray() ?? [];
    }

    /// <summary>
    /// List of child component IDs that belong to this card.
    /// </summary>
    [JsonPropertyName("children")]
    public IReadOnlyList<string> Children { get; }
}
