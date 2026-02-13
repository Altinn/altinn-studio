using System.Text.Json;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Models.Layout;

/// <summary>
/// Wrapper class for a single subfolder in App/ui/
/// </summary>
public sealed class UiFolderComponent
{
    private readonly Dictionary<string, PageComponent> _pagesLookup;
    private readonly List<PageComponent> _pages;

    /// <summary>
    /// Create a new instance representing a single subfolder in App/ui/ (formerly called a layout-set)
    /// </summary>
    public UiFolderComponent(List<PageComponent> pages, string id, DataType defaultDataType)
    {
        _pages = pages;
        _pagesLookup = pages.ToDictionary(p => p.PageId);
        Name = id;
        DefaultDataType = defaultDataType;
    }

    internal UiFolderComponent(
        IReadOnlyDictionary<string, JsonElement> layouts,
        string folderName,
        DataType defaultDataType
    )
    {
        _pages = layouts.Select(kvp => PageComponent.Parse(kvp.Value, kvp.Key, folderName)).ToList();
        _pagesLookup = _pages.ToDictionary(p => p.PageId);
        Name = folderName;
        DefaultDataType = defaultDataType;
    }

    /// <summary>
    /// Name of the folder
    /// </summary>
    public string Name { get; }

    /// <summary>
    /// The data type associated with these pages
    /// </summary>
    public DataType DefaultDataType { get; }

    /// <summary>
    /// Get a single page/layout by name
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
    /// Enumerate over all the pages/layouts in the folder
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
