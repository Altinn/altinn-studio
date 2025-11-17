using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Models.Layout.Components.Base;

/// <summary>
/// Represents a repeating reference component in a layout.
/// This component type manages references to its child components, allowing dynamic structure in layouts.
/// </summary>
public abstract class RepeatingReferenceComponent : BaseLayoutComponent
{
    /// <summary>
    /// Model binding for the group that defines the number of repetitions of the repeating group.
    /// </summary>
    public required ModelBinding GroupModelBinding { get; init; }

    /// <summary>
    /// The expression that determines if the row is hidden.
    /// </summary>
    public required Expression HiddenRow { get; init; }

    /// <summary>
    /// List of references to child components that are repeated for each row in the repeating group.
    /// </summary>
    public required IReadOnlyList<string> RepeatingChildReferences { get; init; }

    /// <summary>
    /// References to child components that are not repeated and comes before the repeating group
    /// </summary>
    public required IReadOnlyList<string> BeforeChildReferences { get; init; }

    /// <summary>
    /// References to child components that are not repeated and comes after the repeating group
    /// </summary>
    public required IReadOnlyList<string> AfterChildReferences { get; init; }

    // References to the components that are used for the child contexts of this component
    private Dictionary<string, BaseLayoutComponent>? _claimedChildrenLookup;

    // used for some tests to ensure hierarchy is correct
    internal IEnumerable<BaseComponent>? AllChildren => _claimedChildrenLookup?.Values;

    /// <inheritdoc />
    public override void ClaimChildren(
        Dictionary<string, BaseLayoutComponent> unclaimedComponents,
        Dictionary<string, string> claimedComponents
    )
    {
        if (
            GroupModelBinding.Field is null
            || RepeatingChildReferences is null
            || BeforeChildReferences is null
            || AfterChildReferences is null
        )
        {
            throw new UnreachableException(
                $"{GetType().Name} inherits from {nameof(RepeatingReferenceComponent)} and must initialize {nameof(GroupModelBinding)}, {nameof(RepeatingChildReferences)}, {nameof(HiddenRow)}, {nameof(BeforeChildReferences)} and {nameof(AfterChildReferences)} in its constructor."
            );
        }

        var components = new Dictionary<string, BaseLayoutComponent>();
        foreach (var componentId in BeforeChildReferences.Concat(RepeatingChildReferences).Concat(AfterChildReferences))
        {
            if (unclaimedComponents.Remove(componentId, out var component))
            {
                claimedComponents[componentId] = Id;
            }
            else
            {
                // Invalid reference. Throw the appropriate exception.
                if (claimedComponents.TryGetValue(componentId, out var claimedComponent))
                {
                    throw new ArgumentException(
                        $"Attempted to claim child with id {componentId} to component {Id}, but it has already been claimed by {claimedComponent}."
                    );
                }
                throw new ArgumentException(
                    $"Attempted to claim child with id {componentId} to component {Id}, but the componentId does not exist"
                );
            }

            if (!components.TryAdd(component.Id, component))
            {
                throw new ArgumentException($"Component with id {component.Id} is claimed twice by {Id}.");
            }
        }

        _claimedChildrenLookup = components;
    }

    /// <inheritdoc />
    public override async Task<ComponentContext> GetContext(
        LayoutEvaluatorState state,
        DataElementIdentifier defaultDataElementIdentifier,
        int[]? rowIndexes,
        Dictionary<string, LayoutSetComponent> layoutsLookup
    )
    {
        if (
            _claimedChildrenLookup is null
            || RepeatingChildReferences is null
            || BeforeChildReferences is null
            || GroupModelBinding.Field is null
            || AfterChildReferences is null
        )
        {
            throw new InvalidOperationException(
                $"{GetType().Name} must call {nameof(ClaimChildren)} before calling {nameof(GetContext)}."
            );
        }

        var childContexts = new List<ComponentContext>();

        foreach (var componentId in BeforeChildReferences)
        {
            childContexts.Add(
                await GetChildContext(componentId, state, defaultDataElementIdentifier, rowIndexes, layoutsLookup)
            );
        }

        var rowCount = await state.GetModelDataCount(GroupModelBinding, defaultDataElementIdentifier, rowIndexes) ?? 0;

        for (int i = 0; i < rowCount; i++)
        {
            var subRowIndexes = GetSubRowIndexes(rowIndexes, i);
            List<ComponentContext> rowChildren = [];
            foreach (var componentId in RepeatingChildReferences)
            {
                rowChildren.Add(
                    await GetChildContext(
                        componentId,
                        state,
                        defaultDataElementIdentifier,
                        subRowIndexes,
                        layoutsLookup
                    )
                );
            }

            childContexts.Add(
                new ComponentContext(
                    state,
                    new RepeatingGroupRowComponent(this, i),
                    subRowIndexes,
                    defaultDataElementIdentifier,
                    rowChildren
                )
            );
        }

        foreach (var componentId in AfterChildReferences)
        {
            childContexts.Add(
                await GetChildContext(componentId, state, defaultDataElementIdentifier, rowIndexes, layoutsLookup)
            );
        }

        return new ComponentContext(state, this, rowIndexes, defaultDataElementIdentifier, childContexts);
    }

    private async Task<ComponentContext> GetChildContext(
        string componentId,
        LayoutEvaluatorState state,
        DataElementIdentifier defaultDataElementIdentifier,
        int[]? rowIndexes,
        Dictionary<string, LayoutSetComponent> layoutsLookup
    )
    {
        Debug.Assert(_claimedChildrenLookup is not null, "Must call ClaimChildren before GetContext");
        if (!_claimedChildrenLookup.TryGetValue(componentId, out var childComponent))
        {
            throw new ArgumentException($"Child component with id {componentId} not found in claimed children.");
        }

        return await childComponent.GetContext(state, defaultDataElementIdentifier, rowIndexes, layoutsLookup);
    }

    internal static int[] GetSubRowIndexes(int[]? baseIndexes, int index)
    {
        if (baseIndexes is null || baseIndexes.Length == 0)
        {
            return new[] { index };
        }
        var result = new int[baseIndexes.Length + 1];
        Array.Copy(baseIndexes, result, baseIndexes.Length);
        result[^1] = index;
        return result;
    }
}

/// <summary>
/// Component for each row (not read from JSON layout, but created when generating contexts for repeating groups).
/// </summary>
public class RepeatingGroupRowComponent : BaseComponent
{
    /// <summary>
    /// Initializes a new instance of the <see cref="RepeatingGroupRowComponent"/> class from the surrounding group component.
    /// </summary>
    [SetsRequiredMembers]
    public RepeatingGroupRowComponent(RepeatingReferenceComponent repeatingReferenceComponent, int index)
    {
        Id = $"{repeatingReferenceComponent.Id}__group_row_{index}";
        PageId = repeatingReferenceComponent.PageId;
        LayoutId = repeatingReferenceComponent.LayoutId;
        DataModelBindings = repeatingReferenceComponent.DataModelBindings;
        Hidden = repeatingReferenceComponent.HiddenRow;
        RemoveWhenHidden = repeatingReferenceComponent.RemoveWhenHidden;
        Type = "repeatingGroupRow";
        ReadOnly = Expression.False; // We don't have a row level readOnly, only at the group or child component level
        Required = Expression.False; // We don't have a row level required, only at the group or child component level
        TextResourceBindings = repeatingReferenceComponent.TextResourceBindings;
    }
}
