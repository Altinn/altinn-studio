using Altinn.App.Core.Models.Layout.Components;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Models.Layout;

/// <summary>
/// Wrapper class for a single layout set
/// </summary>
public record LayoutSetComponent
{
    private readonly Dictionary<string, PageComponent> _pagesLookup;
    private readonly List<PageComponent> _pages;

    /// <summary>
    /// Create a new layout
    /// </summary>
    public LayoutSetComponent(List<PageComponent> pages, string id, DataType defaultDataType)
    {
        _pages = pages;
        _pagesLookup = pages.ToDictionary(p => p.PageId);
        Id = id;
        DefaultDataType = defaultDataType;
    }

    /// <summary>
    /// Name of the layout set
    /// </summary>
    public string Id { get; }

    /// <summary>
    /// The data type associated with this layout
    /// </summary>
    public DataType DefaultDataType { get; }

    /// <summary>
    /// Get a single page by name
    /// </summary>
    public PageComponent GetPage(string pageName)
    {
        if (!_pagesLookup.TryGetValue(pageName, out var page))
        {
            throw new ArgumentException($"Unknown page name {pageName}");
        }
        return page;
    }

    /// <summary>
    /// Enumerate over all the pages in the layout
    /// </summary>
    public IEnumerable<PageComponent> Pages => _pages;

    /// <summary>
    /// Get the <see cref="DataElementIdentifier"/> of the <see cref="DataElement"/> that is default for this layout
    /// </summary>
    public DataElementIdentifier? GetDefaultDataElementId(Instance instance)
    {
        var dataType = DefaultDataType.Id;
        var dataElement = instance.Data.Find(d => d.DataType == dataType);
        if (dataElement is null)
        {
            return null;
        }
        return (DataElementIdentifier?)dataElement;
    }
}
