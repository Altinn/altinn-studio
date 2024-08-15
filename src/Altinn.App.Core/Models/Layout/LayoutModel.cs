using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Models.Layout;

/// <summary>
/// Class for handling a full layout/layoutset
/// </summary>
public record LayoutModel
{
    /// <summary>
    /// Dictionary to hold the different pages that are part of this LayoutModel
    /// </summary>
    public required IReadOnlyDictionary<string, PageComponent> Pages { get; init; }

    /// <summary>
    /// The default data type for the layout model
    /// </summary>
    public required DataType DefaultDataType { get; init; }

    /// <summary>
    /// Get a specific component on a specific page.
    /// </summary>
    public BaseComponent GetComponent(string pageName, string componentId)
    {
        if (!Pages.TryGetValue(pageName, out var page))
        {
            throw new ArgumentException($"Unknown page name {pageName}");
        }

        if (!page.ComponentLookup.TryGetValue(componentId, out var component))
        {
            throw new ArgumentException($"Unknown component {componentId} on {pageName}");
        }
        return component;
    }

    /// <summary>
    /// Get all components by recursivly walking all the pages.
    /// </summary>
    public IEnumerable<BaseComponent> GetComponents()
    {
        // Use a stack in order to implement a depth first search
        var nodes = new Stack<BaseComponent>(Pages.Values);
        while (nodes.Count != 0)
        {
            var node = nodes.Pop();
            yield return node;
            if (node is GroupComponent groupNode)
                foreach (var n in groupNode.Children)
                    nodes.Push(n);
        }
    }

    /// <summary>
    /// Get all external model references used in the layout model
    /// </summary>
    public IEnumerable<string> GetReferencedDataTypeIds()
    {
        var externalModelReferences = new HashSet<string>();
        foreach (var component in GetComponents())
        {
            // Add data model references from DataModelBindings
            externalModelReferences.UnionWith(
                component.DataModelBindings.Values.Select(d => d.DataType).OfType<string>()
            );

            // Add data model references from expressions
            AddExternalModelReferences(component.Hidden, externalModelReferences);
            AddExternalModelReferences(component.ReadOnly, externalModelReferences);
            AddExternalModelReferences(component.Required, externalModelReferences);
            //TODO: add more expressions when backend uses them
        }

        //Ensure that the defaultData type is first in the resulting enumerable.
        externalModelReferences.Remove(DefaultDataType.Id);
        return externalModelReferences.Prepend(DefaultDataType.Id);
    }

    private static void AddExternalModelReferences(Expression expression, HashSet<string> externalModelReferences)
    {
        if (
            expression is
            { Function: ExpressionFunction.dataModel, Args: [_, { Value: string externalModelReference }] }
        )
        {
            externalModelReferences.Add(externalModelReference);
        }
        else
        {
            expression.Args?.ForEach(arg => AddExternalModelReferences(arg, externalModelReferences));
        }
    }
}
