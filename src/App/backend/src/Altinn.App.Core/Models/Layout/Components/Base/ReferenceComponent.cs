using Altinn.App.Core.Features;
using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Models.Layout.Components.Base;

/// <summary>
/// Utility class for components that references other components without any repeating logic, such as Grid, Accordion, or Tabs.
/// </summary>
public abstract class ReferenceComponent : BaseLayoutComponent
{
    /// <summary>
    /// Only components in this assembly can derive from <see cref="ReferenceComponent"/>.
    /// </summary>
    private protected ReferenceComponent() { }

    /// <summary>
    /// The components this component contains, in the order they are referenced in the layout.
    /// </summary>
    public required IReadOnlyList<BaseLayoutComponent> Children { get; init; }

    /// <summary>
    /// Find a child by id in the children passed to a component's parser.
    /// </summary>
    private protected static BaseLayoutComponent FindChild(IReadOnlyList<BaseLayoutComponent> children, string id)
    {
        foreach (var child in children)
        {
            if (child.Id == id)
            {
                return child;
            }
        }

        throw new ArgumentException($"Child component with id \"{id}\" was not claimed.");
    }

    /// <inheritdoc />
    public override async Task<ComponentContext> GetContext(
        IInstanceDataAccessor dataAccessor,
        DataElementIdentifier defaultDataElementIdentifier,
        int[]? rowIndexes,
        Dictionary<string, UiFolderComponent> layoutsLookup
    )
    {
        List<ComponentContext> childContexts = new(Children.Count);
        foreach (var child in Children)
        {
            childContexts.Add(
                await child.GetContext(dataAccessor, defaultDataElementIdentifier, rowIndexes, layoutsLookup)
            );
        }

        return new ComponentContext(dataAccessor, this, rowIndexes, defaultDataElementIdentifier, childContexts);
    }
}
