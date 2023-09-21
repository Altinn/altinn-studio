using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;

namespace Altinn.App.Core.Models.Expressions;

/// <summary>
/// Simple class for holding the context for <see cref="ExpressionEvaluator"/>
/// </summary>
public sealed class ComponentContext
{
    /// <summary>
    /// Constructor for ComponentContext
    /// </summary>
    public ComponentContext(BaseComponent component, int[]? rowIndices, int? rowLength, IEnumerable<ComponentContext>? childContexts = null)
    {
        Component = component;
        RowIndices = rowIndices;
        RowLength = rowLength;
        ChildContexts = childContexts ?? Enumerable.Empty<ComponentContext>();
        foreach (var child in ChildContexts)
        {
            child.Parent = this;
        }
    }

    /// <summary>
    /// The component from <see cref="LayoutModel"/> that should be used as context
    /// </summary>
    public BaseComponent Component { get; }

    /// <summary>
    /// The indicies for this context (in case the component is part of a repeating group)
    /// </summary>
    public int[]? RowIndices { get; }

    /// <summary>
    /// The number of rows in case the component is a repeating group
    /// </summary>
    public int? RowLength { get; }

    /// <summary>
    /// Whether or not the component is hidden
    /// </summary>
    public bool? IsHidden { get; set; }

    /// <summary>
    /// Hidden rows for repeating group
    /// </summary>
    public int[]? HiddenRows { get; set; }

    /// <summary>
    /// Contexts that logically belongs under this context (eg cell => row => group=> page)
    /// </summary>
    public IEnumerable<ComponentContext> ChildContexts { get; }

    /// <summary>
    /// Parent context or null, if this is a root context, or a context created without setting parent
    /// </summary>
    public ComponentContext? Parent { get; set; }

    /// <summary>
    /// Get all children and children of children of this componentContext (not including this)
    /// </summary>
    public IEnumerable<ComponentContext> Decendants
    {
        get
        {
            var stack = new Stack<ComponentContext>(ChildContexts);
            while (stack.Any())
            {
                var node = stack.Pop();
                yield return node;
                foreach (var child in node.ChildContexts) stack.Push(child);
            }
        }
    }

    // /// <summary>
    // /// Custom equals that makes sure the component has the same ID and page, and that the shortest RowIndicies match
    // /// </summary>
    // public override bool Equals(object? obj)
    // {
    //     return obj is ComponentContext context &&
    //            context.Component.Id == Component.Id &&
    //            context.Component.PageId == Component.PageId &&
    //            (context.RowIndices?.Zip(RowIndices??Enumerable.Empty<int>()).All((i)=> i.First == i.Second) ?? true);
    // }

    // /// <summary>
    // /// Implement to remove warning when overriding <see cref="Equals" />. It is likely never used as a Dictionary Key.
    // /// </summary>
    // public override int GetHashCode()
    // {
    //     // Ignore RowIndicies and ChildContexts
    //     return HashCode.Combine(Component.PageId, Component.Id);
    // }
}
