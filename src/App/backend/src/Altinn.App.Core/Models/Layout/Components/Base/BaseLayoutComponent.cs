using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Models.Layout.Components.Base;

/// <summary>
/// Components that can be directly read from a layout with extra tools related to layout parsing
/// </summary>
public abstract class BaseLayoutComponent : BaseComponent
{
    /// <summary>
    /// Only components in this assembly can derive from <see cref="BaseLayoutComponent"/>.
    /// </summary>
    private protected BaseLayoutComponent() { }

    /// <summary>
    /// Creates a context for the component based on the provided parameters.
    /// </summary>
    /// <param name="state">The current layout evaluator state.</param>
    /// <param name="defaultDataElementIdentifier">The default data element identifier for the layout.</param>
    /// <param name="rowIndexes">The current row indexes for components within repeating groups, or null for non-repeating contexts.</param>
    /// <param name="layoutsLookup">A lookup dictionary for resolving UI folder components.</param>
    /// <returns>A <see cref="ComponentContext"/> instance representing the current context of the component.</returns>
    [Obsolete(
        "Use the overload that takes an IInstanceDataAccessor instead as LayoutEvaluatorState is being phased out",
        error: true
    )]
    public Task<ComponentContext> GetContext(
        LayoutEvaluatorState state,
        DataElementIdentifier defaultDataElementIdentifier,
        int[]? rowIndexes,
        IReadOnlyDictionary<string, UiFolderComponent> layoutsLookup
    )
    {
        throw new NotImplementedException(
            "This method is obsolete. Use the overload that takes an IInstanceDataAccessor instead."
        );
    }

    /// <summary>
    /// Creates a context for the component based on the provided parameters.
    /// </summary>
    /// <param name="dataAccessor">The data accessor to be used to check instance data in this context</param>
    /// <param name="defaultDataElementIdentifier">The default data element identifier for the layout.</param>
    /// <param name="rowIndexes">The current row indexes for components within repeating groups, or null for non-repeating contexts.</param>
    /// <param name="layoutsLookup">A lookup dictionary for resolving UI folder components.</param>
    /// <returns>A <see cref="ComponentContext"/> instance representing the current context of the component.</returns>
    public abstract Task<ComponentContext> GetContext(
        IInstanceDataAccessor dataAccessor,
        DataElementIdentifier defaultDataElementIdentifier,
        int[]? rowIndexes,
        IReadOnlyDictionary<string, UiFolderComponent> layoutsLookup
    );
}
