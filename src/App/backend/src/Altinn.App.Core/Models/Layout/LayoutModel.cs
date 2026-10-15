using System.Collections.Frozen;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout.Components.Base;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Models.Layout;

/// <summary>
/// Class for handling a full layout/collection of layouts
/// </summary>
public sealed class LayoutModel
{
    private readonly FrozenDictionary<string, UiFolderComponent> _layoutsLookup;
    private readonly UiFolderComponent _defaultFolder;

    /// <summary>
    /// Constructor for the component model that wraps multiple layouts
    /// </summary>
    /// <param name="folders">List of layouts we need</param>
    /// <param name="defaultFolder">Optional default layout id (if not just using the first)</param>
    public LayoutModel(IEnumerable<UiFolderComponent> folders, string? defaultFolder)
    {
        var folderList = folders.ToList();
        _layoutsLookup = folderList.ToDictionary(l => l.Name).ToFrozenDictionary();
        _defaultFolder = defaultFolder is not null ? _layoutsLookup[defaultFolder] : folderList[0];
    }

    /// <summary>
    /// Id of the default data type for the layout model
    /// </summary>
    public string DefaultDataTypeId => _defaultFolder.DefaultDataTypeId;

    /// <summary>
    /// All components in the layout model
    /// </summary>
    public IEnumerable<BaseComponent> AllComponents => _defaultFolder.Pages.SelectMany(page => page.AllComponents);

    /// <summary>
    /// Generate a list of <see cref="ComponentContext"/> for all components in the layout model
    /// taking repeating groups into account.
    /// </summary>
    public async Task<List<ComponentContext>> GenerateComponentContexts(IInstanceDataAccessor dataAccessor)
    {
        var defaultElementId = _defaultFolder.GetDefaultDataElementId(dataAccessor.Instance);
        if (defaultElementId is null)
        {
            return [];
        }

        var pageContexts = new List<ComponentContext>();
        foreach (var page in _defaultFolder.Pages)
        {
            pageContexts.Add(await page.GetContextForPage(dataAccessor, defaultElementId.Value, null, _layoutsLookup));
        }

        return pageContexts;
    }

    internal DataElementIdentifier? GetDefaultDataElementId(Instance instance)
    {
        return _defaultFolder.GetDefaultDataElementId(instance);
    }
}
