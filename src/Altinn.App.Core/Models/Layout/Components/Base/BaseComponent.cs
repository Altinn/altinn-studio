using System.Collections.Immutable;
using System.Diagnostics;
using System.Text.Json;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Models.Layout.Components.Base;

/// <summary>
/// Abstract base class for all components in a layout.
/// This class provides common properties and methods that all components should implement.
/// </summary>
public abstract class BaseComponent
{
    /// <summary>
    /// ID of the component (or pageName for pages)
    /// </summary>
    public required string Id { get; init; }

    /// <summary>
    /// The name of the page for the component
    /// </summary>
    public required string PageId { get; init; }

    /// <summary>
    /// Name of the layout that this component is part of
    /// </summary>
    public required string LayoutId { get; init; }

    /// <summary>
    /// Component type as written in the json file
    /// </summary>
    public required string Type { get; init; }

    /// <summary>
    /// Layout Expression that can be evaluated to see if the component should be hidden
    /// </summary>
    public required Expression Hidden { get; init; }

    /// <summary>
    /// Signal whether the data referenced by this component should be removed at the end of the task.
    /// </summary>
    public required Expression RemoveWhenHidden { get; init; }

    /// <summary>
    /// Layout Expression that can be evaluated to see if the component should be required
    /// </summary>
    public required Expression Required { get; init; }

    /// <summary>
    /// Layout Expression that can be evaluated to see if the component should be readOnly
    /// </summary>
    public required Expression ReadOnly { get; init; }

    /// <summary>
    /// Data model bindings for the component or group
    /// </summary>
    public required IReadOnlyDictionary<string, ModelBinding> DataModelBindings { get; init; }

    /// <summary>
    /// The text resource bindings for the component.
    /// </summary>
    public required IReadOnlyDictionary<string, Expression> TextResourceBindings { get; init; }

    /// <summary>
    /// Creates a context for the component based on the provided parameters.
    /// </summary>
    /// <returns>A <see cref="ComponentContext"/> instance representing the current context of the component.</returns>
    public abstract Task<ComponentContext> GetContext(
        LayoutEvaluatorState state,
        DataElementIdentifier defaultDataElementIdentifier,
        int[]? rowIndexes,
        Dictionary<string, LayoutSetComponent> layoutsLookup
    );

    /// <summary>
    /// Get the data model bindings that should be removed when the component is hidden,
    /// or should be kept when the component is not hidden.
    /// </summary>
    /// <returns>List of data references (with indexes) to remove when hidden, or keep when not hidden</returns>
    public virtual async Task<IEnumerable<DataReference>> GetDataReferencesToRemoveWhenHidden(ComponentContext context)
    {
        var references = new List<DataReference>();

        foreach (var binding in DataModelBindings.Values)
        {
            references.Add(await context.AddIndexes(binding));
        }

        return references;
    }

    /// <summary>
    /// Claims child components based on the provided references and updates the lookup dictionaries.
    /// </summary>
    /// <param name="unclaimedComponents">
    /// A dictionary of unclaimed components, where keys are component IDs and values are the corresponding component instances.
    /// </param>
    /// <param name="claimedComponents">
    /// A dictionary to track claimed components, where the keys are component IDs and values are the IDs of the components that claimed them.
    /// </param>
    public abstract void ClaimChildren(
        Dictionary<string, BaseComponent> unclaimedComponents,
        Dictionary<string, string> claimedComponents
    );

    /// <summary>
    /// Parse the Id property from a JsonElement
    /// </summary>
    protected static string ParseId(JsonElement componentElement)
    {
        if (
            !componentElement.TryGetProperty("id", out JsonElement idElement)
            || idElement.ValueKind != JsonValueKind.String
        )
        {
            throw new JsonException($"Component must have a string 'id' property. Was {idElement.ValueKind}");
        }

        return idElement.GetString() ?? throw new UnreachableException();
    }

    /// <summary>
    /// Parse the Type property from a JsonElement
    /// </summary>
    protected static string ParseType(JsonElement componentElement)
    {
        if (
            !componentElement.TryGetProperty("type", out JsonElement typeElement)
            || typeElement.ValueKind != JsonValueKind.String
        )
        {
            throw new JsonException($"Component must have a string 'type' property. Was {typeElement.ValueKind}");
        }

        return typeElement.GetString() ?? throw new UnreachableException();
    }

    /// <summary>
    /// Helper method to parse an expression from a JSON element.
    /// </summary>
    protected static Expression ParseExpression(JsonElement componentElement, string property)
    {
        if (componentElement.TryGetProperty(property, out var expressionElement))
        {
            return ExpressionConverter.ReadStatic(expressionElement);
        }

        return new Expression(ExpressionValue.Undefined);
    }

    /// <summary>
    /// Parses the 'required' expression from a JSON element.
    /// </summary>
    protected static Expression ParseRequiredExpression(JsonElement componentElement) =>
        ParseExpression(componentElement, "required");

    /// <summary>
    /// Parses the 'readOnly' expression from a JSON element.
    /// </summary>
    protected static Expression ParseReadOnlyExpression(JsonElement componentElement) =>
        ParseExpression(componentElement, "readOnly");

    /// <summary>
    /// Parses the 'hidden' expression from a JSON element.
    /// </summary>
    protected static Expression ParseHiddenExpression(JsonElement componentElement) =>
        ParseExpression(componentElement, "hidden");

    /// <summary>
    /// Parses the 'removeWhenHidden' expression from a JSON element.
    /// </summary>
    protected static Expression ParseRemoveWhenHiddenExpression(JsonElement componentElement) =>
        ParseExpression(componentElement, "removeWhenHidden");

    /// <summary>
    /// Parses the data model bindings from a JSON element.
    /// </summary>
    protected static IReadOnlyDictionary<string, ModelBinding> ParseDataModelBindings(JsonElement element)
    {
        if (
            !element.TryGetProperty("dataModelBindings", out JsonElement dataModelBindingsElement)
            || dataModelBindingsElement.ValueKind == JsonValueKind.Null
        )
        {
            // If the property is not present or is null, return an empty dictionary
            return ImmutableDictionary<string, ModelBinding>.Empty;
        }

        var modelBindings = new Dictionary<string, ModelBinding>();
        if (dataModelBindingsElement.ValueKind != JsonValueKind.Object)
        {
            throw new JsonException(
                $"Unexpected JSON token type '{dataModelBindingsElement.ValueKind}' for \"dataModelBindings\", expected '{nameof(JsonValueKind.Object)}'"
            );
        }

        foreach (var property in dataModelBindingsElement.EnumerateObject())
        {
            modelBindings[property.Name] = property.Value.ValueKind switch
            {
                JsonValueKind.String => new ModelBinding
                {
                    Field = property.Value.GetString() ?? throw new UnreachableException(),
                },
                JsonValueKind.Object => property.Value.Deserialize<ModelBinding>(),
                _ => throw new JsonException("dataModelBindings must be a string or an object"),
            };
        }

        return modelBindings;
    }

    /// <summary>
    /// Parses the text resource bindings from a JSON element.
    /// </summary>
    protected static Dictionary<string, Expression> ParseTextResourceBindings(JsonElement element)
    {
        if (
            !element.TryGetProperty("textResourceBindings", out JsonElement textResourceBindingsElement)
            || textResourceBindingsElement.ValueKind == JsonValueKind.Null
        )
        {
            return [];
        }
        if (textResourceBindingsElement.ValueKind != JsonValueKind.Object)
        {
            throw new JsonException(
                $"Unexpected JSON token type '{textResourceBindingsElement.ValueKind}' for \"textResourceBindings\", expected '{nameof(JsonValueKind.Object)}'"
            );
        }

        return textResourceBindingsElement.Deserialize<Dictionary<string, Expression>>() ?? [];
    }

    /// <summary>
    /// Parses the child references from a JSON element.
    /// Extracts the child component IDs from a JSON element, stripping any multipage group index.
    /// </summary>
    protected static List<string> ParseChildReferences(JsonElement componentElement, string layoutId, string pageId)
    {
        if (
            !componentElement.TryGetProperty("children", out JsonElement childrenElement)
            || childrenElement.ValueKind != JsonValueKind.Array
        )
        {
            throw new JsonException($"Component {layoutId}.{pageId} must have a \"children\" property of type array.");
        }

        var childReferences = new List<string>();
        foreach (var child in childrenElement.EnumerateArray())
        {
            childReferences.Add(StripPageIndexForGroupChild(child));
        }

        return childReferences;
    }

    /// <summary>
    /// Utility function to strip the page index from a child ID in a multipage group.
    /// If the child ID is in the format "pageNumber:childId", it returns "childId".
    /// If the child ID does not contain a colon or the part before the colon is not a number, it returns the original child ID.
    /// </summary>
    private static string StripPageIndexForGroupChild(JsonElement child)
    {
        // Group children on multipage groups have the format "pageNumber:childId" (eg "1:child1")
        // These numbers can just be ignored for backend processing, so we strip them out.
        if (child.ValueKind != JsonValueKind.String)
        {
            throw new JsonException("Each child in the \"children\" array must be a string.");
        }
        // ! we just checked the value kind, so we can safely use GetString()
        var childId = child.GetString()!;
        var index = childId.IndexOf(':');
        if (index != -1 && childId[..index].All(c => c is >= '0' and <= '9'))
        {
            // Strip the index if everything before the colon is a number
            return childId[(index + 1)..];
        }

        return childId;
    }
}
