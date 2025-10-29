using System.Collections.Immutable;
using System.Text.Json;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Models.Layout.Components;

/// <summary>
/// Component like object to add Page as a group like object
/// </summary>
public sealed class PageComponent : Base.BaseComponent
{
    /// <summary>
    /// Parser for PageComponent
    /// </summary>
    public static PageComponent Parse(JsonElement outerElement, string pageId, string layoutId)
    {
        if (outerElement.ValueKind != JsonValueKind.Object)
        {
            throw new JsonException("Layout file must be an object.");
        }

        if (!outerElement.TryGetProperty("data", out var dataElement) || dataElement.ValueKind != JsonValueKind.Object)
        {
            throw new JsonException("Layout file must have a \"data\" property of type object.");
        }

        if (
            !dataElement.TryGetProperty("layout", out JsonElement componentsElement)
            || componentsElement.ValueKind != JsonValueKind.Array
        )
        {
            throw new JsonException("PageComponent must have a \"layout\" property of type array.");
        }
        var hidden = ParseHiddenExpression(dataElement);

        List<Base.BaseComponent> componentList = [];

        foreach (var componentElement in componentsElement.EnumerateArray())
        {
            if (componentElement.ValueKind != JsonValueKind.Object)
            {
                throw new JsonException("Each component in the \"layout\" array must be an object.");
            }

            var type = ParseType(componentElement);

            var maxCount =
                componentElement.TryGetProperty("maxCount", out JsonElement maxCountElement)
                && maxCountElement.ValueKind == JsonValueKind.Number
                    ? maxCountElement.GetInt32()
                    : 1;
            // ensure maxCount is positive
            if (maxCount < 0)
            {
                var id = ParseId(componentElement);
                throw new JsonException(
                    $"Component {layoutId}.{pageId}.{id} has invalid maxCount={maxCount}, must be positive."
                );
            }

            Base.BaseComponent component = type.ToLowerInvariant() switch
            {
                "group" when maxCount == 1 => NonRepeatingGroupComponent.Parse(componentElement, pageId, layoutId),
                "group" => RepeatingGroupComponent.Parse(componentElement, pageId, layoutId, maxCount),
                "repeatinggroup" => RepeatingGroupComponent.Parse(componentElement, pageId, layoutId, maxCount),
                "accordion" => NonRepeatingGroupComponent.Parse(componentElement, pageId, layoutId),
                "grid" => GridComponent.Parse(componentElement, pageId, layoutId),
                "subform" => SubFormComponent.Parse(componentElement, pageId, layoutId),
                "tabs" => TabsComponent.Parse(componentElement, pageId, layoutId),
                "cards" => CardsComponent.Parse(componentElement, pageId, layoutId),
                "checkboxes" => OptionsComponent.Parse(componentElement, pageId, layoutId),
                "radiobuttons" => OptionsComponent.Parse(componentElement, pageId, layoutId),
                "dropdown" => OptionsComponent.Parse(componentElement, pageId, layoutId),
                "multipleselect" => OptionsComponent.Parse(componentElement, pageId, layoutId),
                _ => UnknownComponent.Parse(componentElement, pageId, layoutId),
            };

            componentList.Add(component);
        }

        var pageComponentLookup = new Dictionary<string, Base.BaseComponent>(StringComparer.Ordinal);
        foreach (var c in componentList)
        {
            if (!pageComponentLookup.TryAdd(c.Id, c))
            {
                throw new JsonException($"Duplicate component id '{c.Id}' on page '{pageId}' in layout '{layoutId}'.");
            }
        }

        Dictionary<string, string> claimedComponentIds = []; // Keep track of claimed components

        // Let all components on the page claim their children
        foreach (var component in componentList)
        {
            component.ClaimChildren(pageComponentLookup, claimedComponentIds);
        }

        // Preserve order but remove components that have been claimed
        return new PageComponent()
        {
            // BaseComponent properties
            Id = pageId,
            PageId = pageId,
            LayoutId = layoutId,
            Type = "page",
            Required = Expression.False,
            ReadOnly = Expression.False,
            Hidden = hidden,
            RemoveWhenHidden = Expression.Null,
            DataModelBindings = ImmutableDictionary<string, ModelBinding>.Empty,
            TextResourceBindings = ImmutableDictionary<string, Expression>.Empty,
            // Custom properties
            Components = componentList.Where(c => !claimedComponentIds.ContainsKey(c.Id)).ToList(),
        };
    }

    /// <summary>
    /// List of the components that are part of this page.
    /// </summary>
    public required IReadOnlyList<Base.BaseComponent> Components { get; init; }

    /// <inheritdoc />
    public override async Task<ComponentContext> GetContext(
        LayoutEvaluatorState state,
        DataElementIdentifier defaultDataElementIdentifier,
        int[]? rowIndexes,
        Dictionary<string, LayoutSetComponent> layoutsLookup
    )
    {
        List<ComponentContext> childContexts = [];
        foreach (var component in Components)
        {
            childContexts.Add(
                await component.GetContext(state, defaultDataElementIdentifier, rowIndexes, layoutsLookup)
            );
        }

        return new ComponentContext(state, this, rowIndexes, defaultDataElementIdentifier, childContexts);
    }

    /// <summary>
    /// For PageComponent, you need to call RunClaimChidren to claim children for all components on the page.
    /// </summary>
    /// <exception cref="NotImplementedException"></exception>
    public override void ClaimChildren(
        Dictionary<string, Base.BaseComponent> unclaimedComponents,
        Dictionary<string, string> claimedComponents
    )
    {
        throw new NotImplementedException();
    }
}
