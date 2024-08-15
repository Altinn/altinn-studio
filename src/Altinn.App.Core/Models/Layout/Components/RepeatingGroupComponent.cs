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
    /// Maximum number of repeatitions of this repating group
    /// </summary>
    public int MaxCount { get; }

    /// <summary>
    /// Layout Expression that can be evaluated to see if row should be hidden
    /// </summary>
    public Expression HiddenRow { get; }
}
