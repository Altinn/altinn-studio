using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Models.Layout.Components.Base;

/// <summary>
/// Components that can be directly read from a layout with extra tools related to layout parsing
/// </summary>
public abstract class BaseLayoutComponent : BaseComponent
{
    /// <summary>
    /// Creates a context for the component based on the provided parameters.
    /// </summary>
    /// <param name="state">The current layout evaluator state.</param>
    /// <param name="defaultDataElementIdentifier">The default data element identifier for the layout.</param>
    /// <param name="rowIndexes">The current row indexes for components within repeating groups, or null for non-repeating contexts.</param>
    /// <param name="layoutsLookup">A lookup dictionary for resolving layout set components.</param>
    /// <returns>A <see cref="ComponentContext"/> instance representing the current context of the component.</returns>
    public abstract Task<ComponentContext> GetContext(
        LayoutEvaluatorState state,
        DataElementIdentifier defaultDataElementIdentifier,
        int[]? rowIndexes,
        Dictionary<string, LayoutSetComponent> layoutsLookup
    );

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
        Dictionary<string, BaseLayoutComponent> unclaimedComponents,
        Dictionary<string, string> claimedComponents
    );
}
