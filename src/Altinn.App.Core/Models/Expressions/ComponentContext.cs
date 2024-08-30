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
    public ComponentContext(
        BaseComponent? component,
        int[]? rowIndices,
        int? rowLength,
        DataElementId dataElementId,
        IEnumerable<ComponentContext>? childContexts = null
    )
    {
        DataElementId = dataElementId;
        Component = component;
        RowIndices = rowIndices;
        RowLength = rowLength;
        ChildContexts = childContexts ?? [];
        foreach (var child in ChildContexts)
        {
            child.Parent = this;
        }
    }

    /// <summary>
    /// The component from <see cref="LayoutModel"/> that should be used as context
    /// </summary>
    public BaseComponent? Component { get; }

    /// <summary>
    /// The indexes for this context (in case the component is part of a repeating group)
    /// </summary>
    public int[]? RowIndices { get; }

    /// <summary>
    /// The number of rows in case the component is a repeating group
    /// </summary>
    public int? RowLength { get; }

    /// <summary>
    /// Whether the component is hidden
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
    public ComponentContext? Parent { get; private set; }

    /// <summary>
    /// The Id of the default data element in this context
    /// </summary>
    public DataElementId DataElementId { get; }

    /// <summary>
    /// Get all children and children of children of this componentContext (not including this)
    /// </summary>
    public IEnumerable<ComponentContext> Descendants
    {
        get
        {
            var stack = new Stack<ComponentContext>(ChildContexts);
            while (stack.Count != 0)
            {
                var node = stack.Pop();
                yield return node;
                foreach (var child in node.ChildContexts)
                    stack.Push(child);
            }
        }
    }
}
