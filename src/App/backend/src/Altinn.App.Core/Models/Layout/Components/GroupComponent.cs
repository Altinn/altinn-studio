using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Models.Layout.Components;

/// <summary>
/// Tag component to signify that this is a group component
/// </summary>
public record GroupComponent : BaseComponent
{
    /// <summary>
    /// Constructor for GroupComponent
    /// </summary>
    public GroupComponent(
        string id,
        string type,
        IReadOnlyDictionary<string, ModelBinding>? dataModelBindings,
        IReadOnlyCollection<BaseComponent> children,
        IReadOnlyCollection<string>? childIDs,
        Expression hidden,
        Expression required,
        Expression readOnly,
        IReadOnlyDictionary<string, string>? additionalProperties
    )
        : base(id, type, dataModelBindings, hidden, required, readOnly, additionalProperties)
    {
        Children = children;
        ChildIDs = childIDs ?? children.Select(c => c.Id);
        foreach (var child in Children)
        {
            child.Parent = this;
        }
    }

    /// <summary>
    /// The children in this group/page
    /// </summary>
    public IEnumerable<BaseComponent> Children { get; private set; }

    /// <summary>
    /// The child IDs in this group/page
    /// </summary>
    public IEnumerable<string> ChildIDs { get; private set; }

    /// <summary>
    /// Adds a child component which is already defined in its child IDs
    /// </summary>
    public virtual void AddChild(BaseComponent child)
    {
        if (!this.ChildIDs.Contains(child.Id))
        {
            throw new ArgumentException(
                $"Attempted to add child with id {child.Id} to group {this.Id}, but this child is not included in its list of child IDs"
            );
        }
        if (this.Children.FirstOrDefault(c => c.Id == child.Id) != null)
        {
            throw new ArgumentException(
                $"Attempted to add child with id {child.Id} to group {this.Id}, but a child with this id has already been added"
            );
        }
        child.Parent = this;
        this.Children = this.Children.Append(child);
    }
}
