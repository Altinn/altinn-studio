using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Models.Layout.Components;

/// <summary>
/// Custom component for handeling the special fields in "type" = "Summary"
/// </summary>
public record SummaryComponent : BaseComponent
{
    /// <summary>
    /// <see cref="BaseComponent.Id" /> of the component this summary references
    /// </summary>
    public string ComponentRef { get; }

    /// <summary>
    /// Constructor
    /// </summary>
    public SummaryComponent(
        string id,
        string type,
        Expression hidden,
        string componentRef,
        IReadOnlyDictionary<string, string>? additionalProperties
    )
        : base(id, type, null, hidden, Expression.False, Expression.False, additionalProperties)
    {
        ComponentRef = componentRef;
    }
}
