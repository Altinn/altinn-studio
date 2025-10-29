using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Models.Layout.Components.Base;

/// <summary>
/// Utility class for components that references other components without any repeating logic, such as Grid, Accordion, or Tabs.
/// </summary>
public abstract class SimpleReferenceComponent : BaseComponent
{
    /// <summary>
    /// Collection of IDs for children that should be claimed.
    /// </summary>
    public required IReadOnlyCollection<string> ChildReferences { get; init; }

    private IReadOnlyDictionary<string, BaseComponent>? _claimedChildrenLookup;

    // used for some tests to ensure hierarchy is correct
    internal IEnumerable<BaseComponent>? AllChildren => _claimedChildrenLookup?.Values;

    /// <inheritdoc />
    public override void ClaimChildren(
        Dictionary<string, BaseComponent> unclaimedComponents,
        Dictionary<string, string> claimedComponents
    )
    {
        if (ChildReferences is null)
        {
            throw new InvalidOperationException(
                $"{GetType().Name} inherits from {nameof(SimpleReferenceComponent)} and must initialize {nameof(ChildReferences)} in its constructor."
            );
        }

        var components = new Dictionary<string, BaseComponent>();
        foreach (var componentId in ChildReferences)
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

    /// <summary>
    /// Gets the collection of child components that have been claimed as children by this component.
    ///
    /// Will be populated after the <see cref="ClaimChildren"/> method is called.
    /// </summary>
    public IReadOnlyDictionary<string, BaseComponent> ClaimedChildrenLookup =>
        _claimedChildrenLookup
        ?? throw new InvalidOperationException(
            "ClaimChildren has not been called. This is a bug in the component initialization process."
        );

    /// <inheritdoc />
    public override async Task<ComponentContext> GetContext(
        LayoutEvaluatorState state,
        DataElementIdentifier defaultDataElementIdentifier,
        int[]? rowIndexes,
        Dictionary<string, LayoutSetComponent> layoutsLookup
    )
    {
        if (ChildReferences is null)
        {
            throw new InvalidOperationException(
                $"{GetType().Name} inherits from {nameof(SimpleReferenceComponent)} and must initialize {nameof(ChildReferences)} in its constructor."
            );
        }

        List<ComponentContext> childContexts = [];
        foreach (var childId in ChildReferences)
        {
            if (ClaimedChildrenLookup.TryGetValue(childId, out var childComponent))
            {
                childContexts.Add(
                    await childComponent.GetContext(state, defaultDataElementIdentifier, rowIndexes, layoutsLookup)
                );
            }
            else
            {
                throw new ArgumentException($"Child component with ID '{childId}' is not claimed.");
            }
        }

        return new ComponentContext(state, this, rowIndexes, defaultDataElementIdentifier, childContexts);
    }
}
