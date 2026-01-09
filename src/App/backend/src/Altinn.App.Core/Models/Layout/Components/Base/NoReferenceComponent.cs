using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Models.Layout.Components.Base;

/// <summary>
/// Simple base component that does not have any references to other components.
/// </summary>
public abstract class NoReferenceComponent : BaseLayoutComponent
{
    /// <summary>
    /// No children to claim for NoReferenceComponent
    /// </summary>
    public override void ClaimChildren(
        Dictionary<string, BaseLayoutComponent> unclaimedComponents,
        Dictionary<string, string> claimedComponents
    ) { }

    /// <summary>
    /// No child contexts to return for NoReferenceComponent
    /// </summary>
    public override Task<ComponentContext> GetContext(
        LayoutEvaluatorState state,
        DataElementIdentifier defaultDataElementIdentifier,
        int[]? rowIndexes,
        Dictionary<string, LayoutSetComponent> layoutsLookup
    ) => Task.FromResult(new ComponentContext(state, this, rowIndexes, defaultDataElementIdentifier));
}
