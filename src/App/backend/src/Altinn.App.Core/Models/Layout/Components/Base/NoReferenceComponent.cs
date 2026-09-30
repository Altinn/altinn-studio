using Altinn.App.Core.Features;
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
        IInstanceDataAccessor dataAccessor,
        DataElementIdentifier defaultDataElementIdentifier,
        int[]? rowIndexes,
        Dictionary<string, UiFolderComponent> layoutsLookup
    ) => Task.FromResult(new ComponentContext(dataAccessor, this, rowIndexes, defaultDataElementIdentifier));
}
