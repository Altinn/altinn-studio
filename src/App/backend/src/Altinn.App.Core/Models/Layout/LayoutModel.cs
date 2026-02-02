using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout.Components.Base;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Models.Layout;

/// <summary>
/// Class for handling a full layout/layoutset
/// </summary>
public sealed class LayoutModel
{
    private readonly Dictionary<string, LayoutSetComponent> _layoutsLookup;
    private readonly LayoutSetComponent _defaultLayoutSet;

    /// <summary>
    /// Constructor for the component model that wraps multiple layouts
    /// </summary>
    /// <param name="layouts">List of layouts we need</param>
    /// <param name="defaultLayout">Optional default layout (if not just using the first)</param>
    public LayoutModel(List<LayoutSetComponent> layouts, LayoutSet? defaultLayout)
    {
        _layoutsLookup = layouts.ToDictionary(l => l.Id);
        _defaultLayoutSet = defaultLayout is not null ? _layoutsLookup[defaultLayout.Id] : layouts[0];
    }

    /// <summary>
    /// The default data type for the layout model
    /// </summary>
    public DataType DefaultDataType => _defaultLayoutSet.DefaultDataType;

    /// <summary>
    /// All components in the layout model
    /// </summary>
    public IEnumerable<BaseComponent> AllComponents => _defaultLayoutSet.Pages.SelectMany(page => page.AllComponents);

    /// <summary>
    /// Generate a list of <see cref="ComponentContext"/> for all components in the layout model
    /// taking repeating groups into account.
    /// </summary>
    public async Task<List<ComponentContext>> GenerateComponentContexts(LayoutEvaluatorState state)
    {
        var defaultElementId = _defaultLayoutSet.GetDefaultDataElementId(state.Instance);
        if (defaultElementId is null)
        {
            return [];
        }

        var pageContexts = new List<ComponentContext>();
        foreach (var page in _defaultLayoutSet.Pages)
        {
            pageContexts.Add(await page.GetContextForPage(state, defaultElementId.Value, null, _layoutsLookup));
        }

        return pageContexts;
    }

    internal DataElementIdentifier? GetDefaultDataElementId(Instance instance)
    {
        return _defaultLayoutSet.GetDefaultDataElementId(instance);
    }
}
