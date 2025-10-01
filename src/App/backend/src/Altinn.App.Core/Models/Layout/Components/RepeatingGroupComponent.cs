using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Models.Layout.Components;

/// <summary>
/// Component specialisation for repeating groups with maxCount > 1
/// </summary>
public record RepeatingGroupComponent : GroupComponent
{
    /// <summary>
    /// Constructor for RepeatingGroupComponent
    /// </summary>
    public RepeatingGroupComponent(
        string id,
        string type,
        IReadOnlyDictionary<string, ModelBinding>? dataModelBindings,
        IReadOnlyCollection<BaseComponent> children,
        IReadOnlyCollection<string>? childIDs,
        int maxCount,
        Expression hidden,
        Expression hiddenRow,
        Expression required,
        Expression readOnly,
        IReadOnlyDictionary<string, string>? additionalProperties
    )
        : base(id, type, dataModelBindings, children, childIDs, hidden, required, readOnly, additionalProperties)
    {
        MaxCount = maxCount;
        HiddenRow = hiddenRow;
    }

    /// <summary>
    /// Maximum number of repetitions of this repeating group
    /// </summary>
    public int MaxCount { get; }

    /// <summary>
    /// Layout Expression that can be evaluated to see if row should be hidden
    /// </summary>
    public Expression HiddenRow { get; }
}

/// <summary>
/// Component (currently only used for contexts to have something to point to) for a row in a repeating group
/// </summary>
public record RepeatingGroupRowComponent : BaseComponent
{
    /// <summary>
    /// Constructor for RepeatingGroupRowComponent
    /// </summary>
    public RepeatingGroupRowComponent(
        string id,
        IReadOnlyDictionary<string, ModelBinding> dataModelBindings,
        Expression hiddenRow,
        BaseComponent parent
    )
        : base(
            id,
            "groupRow",
            dataModelBindings,
            hiddenRow,
            required: Expression.False,
            readOnly: Expression.False,
            null
        )
    {
        Parent = parent;
    }
}
