using System.Collections;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;

namespace Altinn.App.Core.Models.Expressions;

/// <summary>
/// Simple class for holding the context for <see cref="ExpressionEvaluator"/>
/// </summary>
public sealed class ComponentContext
{
    private readonly int? _rowLength;

    /// <summary>
    /// Constructor for ComponentContext
    /// </summary>
    public ComponentContext(
        BaseComponent? component,
        int[]? rowIndices,
        int? rowLength,
        DataElementIdentifier dataElementIdentifier,
        IEnumerable<ComponentContext>? childContexts = null
    )
    {
        DataElementIdentifier = dataElementIdentifier;
        Component = component;
        RowIndices = rowIndices;
        _rowLength = rowLength;
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

    private bool? _isHidden;

    /// <summary>
    /// Memoized way to check if the component is hidden
    /// </summary>
    public async Task<bool> IsHidden(LayoutEvaluatorState state)
    {
        if (_isHidden.HasValue)
        {
            return _isHidden.Value;
        }
        if (Parent is not null && await Parent.IsHidden(state))
        {
            _isHidden = true;
            return _isHidden.Value;
        }

        _isHidden = await ExpressionEvaluator.EvaluateBooleanExpression(state, this, "hidden", false);
        return _isHidden.Value;
    }

    private BitArray? _hiddenRows;

    /// <summary>
    /// Hidden rows for repeating group
    /// </summary>
    public async Task<BitArray> GetHiddenRows(LayoutEvaluatorState state)
    {
        if (_hiddenRows is not null)
        {
            return _hiddenRows;
        }
        if (Component is not RepeatingGroupComponent)
        {
            throw new InvalidOperationException("HiddenRows can only be called on a repeating group");
        }
        if (_rowLength is null)
        {
            throw new InvalidOperationException("RowLength must be set to call HiddenRows on repeating group");
        }

        var hiddenRows = new BitArray(_rowLength.Value);
        foreach (var index in Enumerable.Range(0, hiddenRows.Length))
        {
            var rowIndices = RowIndices?.Append(index).ToArray() ?? [index];
            var childContexts = ChildContexts.Where(c => c.RowIndices?[RowIndices?.Length ?? 0] == index);
            // Row contexts are not in the tree, so we need to create them here
            var rowContext = new ComponentContext(
                Component,
                rowIndices,
                rowLength: hiddenRows.Length,
                dataElementIdentifier: DataElementIdentifier,
                childContexts: childContexts
            );
            var rowHidden = await ExpressionEvaluator.EvaluateBooleanExpression(state, rowContext, "hiddenRow", false);

            hiddenRows[index] = rowHidden;
        }

        // Set the hidden rows so that it does not need to be recomputed
        _hiddenRows = hiddenRows;
        return _hiddenRows;
    }

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
    public DataElementIdentifier DataElementIdentifier { get; }

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
