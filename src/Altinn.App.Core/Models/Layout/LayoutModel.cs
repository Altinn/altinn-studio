using Altinn.App.Core.Models.Layout.Components;

namespace Altinn.App.Core.Models.Layout;

/// <summary>
/// Class for handeling a full layout/layoutset
/// </summary>
public class LayoutModel
{
    /// <summary>
    /// Dictionary to hold the different pages that are part of this LayoutModel
    /// </summary>
    public Dictionary<string, PageComponent> Pages { get; init; } = new Dictionary<string, PageComponent>();

    /// <summary>
    /// Get a page from the <see cref="Pages" /> dictionary
    /// </summary>
    public PageComponent GetPage(string pageName)
    {
        if (Pages.TryGetValue(pageName, out var page))
        {
            return page;
        }
        throw new ArgumentException($"Unknown page name {pageName}");
    }

    /// <summary>
    /// Get a specific component on a specifc page.
    /// </summary>
    public BaseComponent GetComponent(string pageName, string componentId)
    {
        var page = GetPage(pageName);

        if (!page.ComponentLookup.TryGetValue(componentId, out var component))
        {
            throw new ArgumentException($"Unknown component {componentId} on {pageName}");
        }
        return component;
    }

    /// <summary>
    /// Get all components by recursivly walking all the pages.
    /// </summary>
    public IEnumerable<BaseComponent> GetComponents()
    {
        // Use a stack in order to implement a depth first search
        var nodes = new Stack<BaseComponent>(Pages.Values);
        while (nodes.Count != 0)
        {
            var node = nodes.Pop();
            yield return node;
            if (node is GroupComponent groupNode)
                foreach (var n in groupNode.Children)
                    nodes.Push(n);
        }
    }
}
