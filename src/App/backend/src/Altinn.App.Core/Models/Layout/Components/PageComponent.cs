using System.Text.Json.Serialization;
using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Models.Layout.Components;

/// <summary>
/// Component like object to add Page as a group like object
/// </summary>
[JsonConverter(typeof(PageComponentConverter))]
public record PageComponent : GroupComponent
{
    private readonly string _layoutId;

    /// <summary>
    /// Constructor for PageComponent
    /// </summary>
    public PageComponent(
        string id,
        string layoutId,
        List<BaseComponent> children,
        Dictionary<string, BaseComponent> componentLookup,
        Expression hidden,
        Expression required,
        Expression readOnly,
        IReadOnlyDictionary<string, string>? extra
    )
        : base(id, "page", null, children, null, hidden, required, readOnly, extra)
    {
        _layoutId = layoutId;
        ComponentLookup = componentLookup;
    }

    /// <inheritdoc />
    public override string PageId => Id;

    /// <inheritdoc />
    // ReSharper disable once ConvertToAutoProperty (can't set the virtual auto property in constructor (as per sonar cloud))
    public override string LayoutId => _layoutId;

    /// <summary>
    /// Helper dictionary to find components without traversing children.
    /// </summary>
    public Dictionary<string, BaseComponent> ComponentLookup { get; }

    /// <summary>
    /// AddChild is not needed for PageComponent, and the base implementation would not work as intended.
    /// </summary>
    public override void AddChild(BaseComponent child) { }
}
