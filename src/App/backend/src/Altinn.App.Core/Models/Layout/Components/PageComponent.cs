using System.Collections.Immutable;
using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout.Components.Base;

namespace Altinn.App.Core.Models.Layout.Components;

/// <summary>
/// Component like object to add Page as a group like object
/// </summary>
public sealed class PageComponent : BaseComponent
{
    /// <summary>
    /// Parser for PageComponent
    /// </summary>
    /// <remarks>
    /// Parsing runs in two passes. The first reads the type, id and claimed child ids of every component and checks
    /// that every child exists and has exactly one parent. The second builds each component once, children first,
    /// so a component is complete when it is created and never changes afterwards.
    /// </remarks>
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

        // Pass 1: kind, id and claimed child ids of every component
        var nodes = new List<ComponentNode>(componentsElement.GetArrayLength());
        var nodeLookup = new Dictionary<string, ComponentNode>(StringComparer.Ordinal);
        foreach (var componentElement in componentsElement.EnumerateArray())
        {
            var index = nodes.Count;
            var id = WithLocation(pageId, layoutId, index, null, () => ReadId(componentElement));
            var node = WithLocation(pageId, layoutId, index, id, () => ReadNode(componentElement, index, id));
            if (!nodeLookup.TryAdd(node.Id, node))
            {
                throw new JsonException(
                    $"Duplicate component id '{node.Id}' on page '{pageId}' in layout '{layoutId}'."
                );
            }
            nodes.Add(node);
        }

        // Every child must exist and have exactly one parent
        var claimedBy = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var node in nodes)
        {
            foreach (var childId in node.ChildIds)
            {
                if (!nodeLookup.ContainsKey(childId))
                {
                    throw LocatedException(
                        pageId,
                        layoutId,
                        node,
                        $"Attempted to claim child with id \"{childId}\" to component \"{node.Id}\", but the componentId does not exist",
                        null
                    );
                }
                if (!claimedBy.TryAdd(childId, node.Id))
                {
                    var message =
                        claimedBy[childId] == node.Id
                            ? $"Component with id {childId} is claimed twice by {node.Id}."
                            : $"Attempted to claim child with id \"{childId}\" to component \"{node.Id}\", but it has already been claimed by \"{claimedBy[childId]}\".";
                    throw LocatedException(pageId, layoutId, node, message, null);
                }
            }
        }

        // Pass 2: build children before their parents
        var built = new Dictionary<string, BaseLayoutComponent>(StringComparer.Ordinal);
        var inProgress = new HashSet<string>(StringComparer.Ordinal);
        BaseLayoutComponent Resolve(ComponentNode node)
        {
            if (built.TryGetValue(node.Id, out var existing))
            {
                return existing;
            }
            if (!inProgress.Add(node.Id))
            {
                throw LocatedException(
                    pageId,
                    layoutId,
                    node,
                    $"Component \"{node.Id}\" contains itself through its children.",
                    null
                );
            }

            var children = ImmutableArray.CreateBuilder<BaseLayoutComponent>(node.ChildIds.Length);
            foreach (var childId in node.ChildIds)
            {
                children.Add(Resolve(nodeLookup[childId]));
            }
            var component = WithLocation(
                pageId,
                layoutId,
                node.Index,
                node.Id,
                () => ParseNode(node, pageId, layoutId, children.MoveToImmutable())
            );

            inProgress.Remove(node.Id);
            built.Add(node.Id, component);
            return component;
        }

        var allComponents = ImmutableArray.CreateBuilder<BaseLayoutComponent>(nodes.Count);
        foreach (var node in nodes)
        {
            allComponents.Add(Resolve(node));
        }

        return Create(pageId, layoutId, hidden, allComponents.MoveToImmutable());
    }

    /// <summary>
    /// Create a page from components that are already built. The page's direct children are the components that no
    /// other component on the page has as a child.
    /// </summary>
    internal static PageComponent Create(
        string pageId,
        string layoutId,
        Expression hidden,
        IReadOnlyList<BaseLayoutComponent> allComponents
    )
    {
        var parents = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var component in allComponents)
        {
            if (component is not ReferenceComponent referenceComponent)
            {
                continue;
            }
            foreach (var child in referenceComponent.Children)
            {
                if (!parents.TryAdd(child.Id, component.Id))
                {
                    throw new ArgumentException(
                        $"Component \"{child.Id}\" on page \"{pageId}\" has two parents: \"{parents[child.Id]}\" and \"{component.Id}\"."
                    );
                }
            }
        }

        var all = allComponents.ToImmutableArray();
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
            RemoveWhenHidden = Expression.Undefined,
            DataModelBindings = ImmutableDictionary<string, ModelBinding>.Empty,
            TextResourceBindings = ImmutableDictionary<string, Expression>.Empty,
            // Custom properties
            // Preserve order but remove components that have a parent
            ChildComponents = all.Where(c => !parents.ContainsKey(c.Id)).ToImmutableArray(),
            AllComponents = all,
        };
    }

    private enum ComponentKind
    {
        NonRepeatingGroup,
        RepeatingGroup,
        Grid,
        SubForm,
        Tabs,
        Cards,
        Likert,
        Options,
        Unknown,
    }

    private sealed record ComponentNode(
        int Index,
        string Id,
        ComponentKind Kind,
        int MaxCount,
        JsonElement Element,
        ImmutableArray<string> ChildIds
    );

    private static string ReadId(JsonElement componentElement)
    {
        if (componentElement.ValueKind != JsonValueKind.Object)
        {
            throw new JsonException("Each component in the \"layout\" array must be an object.");
        }

        return ParseId(componentElement);
    }

    private static ComponentNode ReadNode(JsonElement componentElement, int index, string id)
    {
        var type = ParseType(componentElement);

        var maxCount =
            componentElement.TryGetProperty("maxCount", out JsonElement maxCountElement)
            && maxCountElement.ValueKind == JsonValueKind.Number
                ? maxCountElement.GetInt32()
                : 1;
        // ensure maxCount is positive
        if (maxCount < 0)
        {
            throw new JsonException($"Invalid maxCount={maxCount}, must be positive.");
        }

        var kind = type.ToLowerInvariant() switch
        {
            "group" when maxCount == 1 => ComponentKind.NonRepeatingGroup,
            "group" => ComponentKind.RepeatingGroup,
            "repeatinggroup" => ComponentKind.RepeatingGroup,
            "accordion" => ComponentKind.NonRepeatingGroup,
            "grid" => ComponentKind.Grid,
            "subform" => ComponentKind.SubForm,
            "tabs" => ComponentKind.Tabs,
            "cards" => ComponentKind.Cards,
            "likert" => ComponentKind.Likert,
            "checkboxes" or "radiobuttons" or "dropdown" or "multipleselect" => ComponentKind.Options,
            _ => ComponentKind.Unknown,
        };

        IEnumerable<string> childIds = kind switch
        {
            ComponentKind.NonRepeatingGroup => NonRepeatingGroupComponent.ClaimChildren(componentElement),
            ComponentKind.RepeatingGroup => RepeatingGroupComponent.ClaimChildren(componentElement),
            ComponentKind.Grid => GridComponent.ClaimChildren(componentElement),
            ComponentKind.Tabs => TabsComponent.ClaimChildren(componentElement),
            ComponentKind.Cards => CardsComponent.ClaimChildren(componentElement),
            _ => [],
        };

        return new ComponentNode(index, id, kind, maxCount, componentElement, [.. childIds]);
    }

    private static BaseLayoutComponent ParseNode(
        ComponentNode node,
        string pageId,
        string layoutId,
        ImmutableArray<BaseLayoutComponent> children
    )
    {
        var element = node.Element;
        return node.Kind switch
        {
            ComponentKind.NonRepeatingGroup => NonRepeatingGroupComponent.Parse(element, pageId, layoutId, children),
            ComponentKind.RepeatingGroup => RepeatingGroupComponent.Parse(
                element,
                pageId,
                layoutId,
                node.MaxCount,
                children
            ),
            ComponentKind.Grid => GridComponent.Parse(element, pageId, layoutId, children),
            ComponentKind.Tabs => TabsComponent.Parse(element, pageId, layoutId, children),
            ComponentKind.Cards => CardsComponent.Parse(element, pageId, layoutId, children),
            ComponentKind.SubForm => SubFormComponent.Parse(element, pageId, layoutId),
            ComponentKind.Likert => LikertComponent.Parse(element, pageId, layoutId),
            ComponentKind.Options => OptionsComponent.Parse(element, pageId, layoutId),
            ComponentKind.Unknown => UnknownComponent.Parse(element, pageId, layoutId),
            _ => throw new InvalidOperationException($"Unknown component kind {node.Kind}"),
        };
    }

    /// <summary>
    /// Run a parsing step for one component and add where the component is to any error it throws.
    /// </summary>
    private static T WithLocation<T>(string pageId, string layoutId, int index, string? id, Func<T> parse)
    {
        try
        {
            return parse();
        }
        catch (Exception e) when (e is JsonException or ArgumentException or FormatException)
        {
            throw LocatedException(pageId, layoutId, index, id, e.Message, e);
        }
    }

    private static JsonException LocatedException(
        string pageId,
        string layoutId,
        ComponentNode node,
        string message,
        Exception? innerException
    ) => LocatedException(pageId, layoutId, node.Index, node.Id, message, innerException);

    private static JsonException LocatedException(
        string pageId,
        string layoutId,
        int index,
        string? id,
        string message,
        Exception? innerException
    )
    {
        var path = $"$.data.layout[{index}]";
        var component = id is null ? $"Component at {path}" : $"Component \"{id}\" at {path}";
        return new JsonException(
            $"{component} on page \"{pageId}\" in layout \"{layoutId}\": {message}",
            path,
            null,
            null,
            innerException
        );
    }

    /// <summary>
    /// A read-only collection of the components that are part of this page.
    /// </summary>
    public required IReadOnlyList<BaseLayoutComponent> ChildComponents { get; init; }

    /// <summary>
    /// A read-only collection of all components associated with this page, including those that are referenced or claimed by other components.
    /// </summary>
    public required IReadOnlyList<BaseComponent> AllComponents { get; init; }

    /// <summary>
    /// Get the context for this page component
    /// </summary>
    public async Task<ComponentContext> GetContextForPage(
        IInstanceDataAccessor dataAccessor,
        DataElementIdentifier defaultDataElementIdentifier,
        int[]? rowIndexes,
        Dictionary<string, UiFolderComponent> layoutsLookup
    )
    {
        List<ComponentContext> childContexts = [];
        foreach (var component in ChildComponents)
        {
            childContexts.Add(
                await component.GetContext(dataAccessor, defaultDataElementIdentifier, rowIndexes, layoutsLookup)
            );
        }

        return new ComponentContext(dataAccessor, this, rowIndexes, defaultDataElementIdentifier, childContexts);
    }
}
