using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout.Components.Base;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Models.Layout;

/// <summary>
/// Class for handling a full layout/collection of layouts
/// </summary>
public sealed class LayoutModel
{
    private readonly Dictionary<string, UiFolderComponent> _layoutsLookup;
    private readonly UiFolderComponent _defaultFolder;

    /// <summary>
    /// Constructor for the component model that wraps multiple layouts
    /// </summary>
    /// <param name="folders">List of layouts we need</param>
    /// <param name="defaultFolder">Optional default layout id (if not just using the first)</param>
    public LayoutModel(List<UiFolderComponent> folders, string? defaultFolder)
    {
        _layoutsLookup = folders.ToDictionary(l => l.Name);
        _defaultFolder = defaultFolder is not null ? _layoutsLookup[defaultFolder] : folders[0];
    }

    /// <summary>
    /// The default data type for the layout model
    /// </summary>
    public DataType DefaultDataType => _defaultFolder.DefaultDataType;

    /// <summary>
    /// All components in the layout model
    /// </summary>
    public IEnumerable<BaseComponent> AllComponents => _defaultFolder.Pages.SelectMany(page => page.AllComponents);

    /// <summary>
    /// Generate a list of <see cref="ComponentContext"/> for all components in the layout model
    /// taking repeating groups into account.
    /// </summary>
    public async Task<List<ComponentContext>> GenerateComponentContexts(LayoutEvaluatorState state)
    {
        var defaultElementId = _defaultFolder.GetDefaultDataElementId(state.Instance);
        if (defaultElementId is null)
        {
            return [];
        }

        var pageContexts = new List<ComponentContext>();
        foreach (var page in _defaultFolder.Pages)
        {
            pageContexts.Add(await page.GetContextForPage(state, defaultElementId.Value, null, _layoutsLookup));
        }

        return pageContexts;
    }

    internal DataElementIdentifier? GetDefaultDataElementId(Instance instance)
    {
        return _defaultFolder.GetDefaultDataElementId(instance);
    }
}
