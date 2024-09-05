using Altinn.App.Core.Helpers.DataModel;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Models.Layout;

/// <summary>
/// Class for handling a full layout/layoutset
/// </summary>
public record LayoutModel
{
    private readonly List<LayoutSetComponent> _layouts;
    private readonly Dictionary<string, LayoutSetComponent> _layoutsLookup;
    private readonly LayoutSetComponent _defaultLayoutSet;

    /// <summary>
    /// Constructor for the component model that wraps multiple layouts
    /// </summary>
    /// <param name="layouts">List of layouts we need</param>
    /// <param name="defaultLayout">Optional default layout (if not just using the first)</param>
    public LayoutModel(List<LayoutSetComponent> layouts, LayoutSet? defaultLayout)
    {
        _layouts = layouts;
        _layoutsLookup = layouts.ToDictionary(l => l.Id);
        _defaultLayoutSet = defaultLayout is not null ? _layoutsLookup[defaultLayout.Id] : layouts[0];
    }

    /// <summary>
    /// The default data type for the layout model
    /// </summary>
    public DataType DefaultDataType => _defaultLayoutSet.DefaultDataType;

    /// <summary>
    /// Get a specific component on a specific page.
    /// </summary>
    public BaseComponent GetComponent(string pageName, string componentId)
    {
        var page = _defaultLayoutSet.GetPage(pageName);

        if (!page.ComponentLookup.TryGetValue(componentId, out var component))
        {
            throw new ArgumentException($"Unknown component {componentId} on {pageName}");
        }
        return component;
    }

    /// <summary>
    /// Get all components by recursively walking all the pages.
    /// </summary>
    public IEnumerable<BaseComponent> GetComponents()
    {
        // Use a stack in order to implement a depth first search
        var nodes = new Stack<BaseComponent>(_defaultLayoutSet.Pages);
        while (nodes.Count != 0)
        {
            var node = nodes.Pop();
            yield return node;
            if (node is GroupComponent groupNode)
                foreach (var n in groupNode.Children)
                    nodes.Push(n);
        }
    }

    /// <summary>
    /// Generate a list of <see cref="ComponentContext"/> for all components in the layout model
    /// taking repeating groups into account.
    /// </summary>
    /// <param name="instance">The instance with data element information</param>
    /// <param name="dataModel">The data model to use for repeating groups</param>
    /// <returns></returns>
    public async Task<List<ComponentContext>> GenerateComponentContexts(Instance instance, DataModel dataModel)
    {
        var pageContexts = new List<ComponentContext>();
        foreach (var page in _defaultLayoutSet.Pages)
        {
            pageContexts.Add(
                await GenerateComponentContextsRecurs(
                    page,
                    dataModel,
                    _defaultLayoutSet.GetDefaultDataElementId(instance),
                    []
                )
            );
        }

        return pageContexts;
    }

    private async Task<ComponentContext> GenerateComponentContextsRecurs(
        BaseComponent component,
        DataModel dataModel,
        DataElementId defaultDataElementId,
        int[]? indexes
    )
    {
        var children = new List<ComponentContext>();
        int? rowLength = null;

        if (component is SubFormComponent subFormComponent)
        {
            var layoutSetId = subFormComponent.LayoutSetId;
            var layout = _layoutsLookup[layoutSetId];
            var dataElementsForSubForm = dataModel.Instance.Data.Where(d => d.DataType == layout.DefaultDataType.Id);
            foreach (var dataElement in dataElementsForSubForm)
            {
                List<ComponentContext> subforms = new();

                foreach (var page in layout.Pages)
                {
                    subforms.Add(await GenerateComponentContextsRecurs(page, dataModel, dataElement, indexes: null));
                }

                children.Add(new ComponentContext(subFormComponent, null, null, dataElement, subforms));
            }
        }
        else if (component is RepeatingGroupComponent repeatingGroupComponent)
        {
            if (repeatingGroupComponent.DataModelBindings.TryGetValue("group", out var groupBinding))
            {
                rowLength = await dataModel.GetModelDataCount(groupBinding, defaultDataElementId, indexes) ?? 0;
                foreach (var index in Enumerable.Range(0, rowLength.Value))
                {
                    foreach (var child in repeatingGroupComponent.Children)
                    {
                        // concatenate [...indexes, index]
                        var subIndexes = new int[(indexes?.Length ?? 0) + 1];
                        indexes.CopyTo(subIndexes.AsSpan());
                        subIndexes[^1] = index;

                        children.Add(
                            await GenerateComponentContextsRecurs(child, dataModel, defaultDataElementId, subIndexes)
                        );
                    }
                }
            }
        }
        else if (component is GroupComponent groupComponent)
        {
            foreach (var child in groupComponent.Children)
            {
                children.Add(await GenerateComponentContextsRecurs(child, dataModel, defaultDataElementId, indexes));
            }
        }

        var context = new ComponentContext(
            component,
            indexes?.Length > 0 ? indexes : null,
            rowLength,
            defaultDataElementId,
            children
        );

        return context;
    }

    internal DataElementId GetDefaultDataElementId(Instance instanceContext)
    {
        return _defaultLayoutSet.GetDefaultDataElementId(instanceContext);
    }
}
