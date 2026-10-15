using System.Collections.Frozen;
using System.Collections.Immutable;
using System.Text.Json;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Models.Layout;

/// <summary>
/// Wrapper class for a single subfolder in App/ui/
/// </summary>
public sealed class UiFolderComponent
{
    private readonly FrozenDictionary<string, PageComponent> _pagesLookup;

    // An ImmutableArray, boxed once here rather than on every read of Pages
    private readonly IReadOnlyList<PageComponent> _pages;

    /// <summary>
    /// Create a new instance representing a single subfolder in App/ui/ (formerly called a layout-set)
    /// </summary>
    /// <param name="pages">The pages of the folder, in order</param>
    /// <param name="id">Name of the folder</param>
    /// <param name="defaultDataTypeId">Id of the data type the pages are bound to by default</param>
    public UiFolderComponent(IEnumerable<PageComponent> pages, string id, string defaultDataTypeId)
    {
        _pages = pages.ToImmutableArray();
        _pagesLookup = _pages.ToDictionary(p => p.PageId).ToFrozenDictionary();
        Name = id;
        DefaultDataTypeId = defaultDataTypeId;
    }

    internal UiFolderComponent(
        IReadOnlyDictionary<string, JsonElement> layouts,
        string folderName,
        string defaultDataTypeId
    )
        : this(
            layouts.Select(kvp => PageComponent.Parse(kvp.Value, kvp.Key, folderName)),
            folderName,
            defaultDataTypeId
        ) { }

    /// <summary>
    /// Name of the folder
    /// </summary>
    public string Name { get; }

    /// <summary>
    /// Id of the data type associated with these pages
    /// </summary>
    public string DefaultDataTypeId { get; }

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
    /// The pages/layouts in the folder, in order
    /// </summary>
    public IReadOnlyList<PageComponent> Pages => _pages;

    /// <summary>
    /// Get the <see cref="DataElementIdentifier"/> of the <see cref="DataElement"/> that is default for this layout
    /// </summary>
    public DataElementIdentifier? GetDefaultDataElementId(Instance instance)
    {
        var dataElement = instance.Data.Find(d => d.DataType == DefaultDataTypeId);
        if (dataElement is null)
        {
            return null;
        }
        return (DataElementIdentifier?)dataElement;
    }
}
