using Altinn.App.Core.Helpers.DataModel;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Models.Layout;

/// <summary>
/// Class for handling a full layout/layoutset
/// </summary>
public class LayoutModel
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
    /// Generate a list of <see cref="ComponentContext"/> for all components in the layout model
    /// taking repeating groups into account.
    /// </summary>
    /// <param name="instance">The instance with data element information</param>
    /// <param name="dataModel">The data model to use for repeating groups</param>
    public async Task<List<ComponentContext>> GenerateComponentContexts(Instance instance, DataModel dataModel)
    {
        var pageContexts = new List<ComponentContext>();
        foreach (var page in _defaultLayoutSet.Pages)
        {
            var defaultElementId = _defaultLayoutSet.GetDefaultDataElementId(instance);
            if (defaultElementId is not null)
            {
                pageContexts.Add(await GenerateComponentContextsRecurs(page, dataModel, defaultElementId.Value, []));
            }
        }

        return pageContexts;
    }

    private async Task<ComponentContext> GenerateComponentContextsRecurs(
        BaseComponent component,
        DataModel dataModel,
        DataElementIdentifier defaultDataElementIdentifier,
        int[]? indexes
    )
    {
        return component switch
        {
            SubFormComponent subFormComponent => await GenerateContextForSubComponent(
                dataModel,
                subFormComponent,
                defaultDataElementIdentifier
            ),

            RepeatingGroupComponent repeatingGroupComponent => await GenerateContextForRepeatingGroup(
                dataModel,
                repeatingGroupComponent,
                defaultDataElementIdentifier,
                indexes
            ),
            GroupComponent groupComponent => await GenerateContextForGroup(
                dataModel,
                groupComponent,
                defaultDataElementIdentifier,
                indexes
            ),
            _ => new ComponentContext(
                component,
                indexes?.Length > 0 ? indexes : null,
                defaultDataElementIdentifier,
                []
            ),
        };
    }

    private async Task<ComponentContext> GenerateContextForGroup(
        DataModel dataModel,
        GroupComponent groupComponent,
        DataElementIdentifier defaultDataElementIdentifier,
        int[]? indexes
    )
    {
        List<ComponentContext> children = [];
        foreach (var child in groupComponent.Children)
        {
            children.Add(
                await GenerateComponentContextsRecurs(child, dataModel, defaultDataElementIdentifier, indexes)
            );
        }

        return new ComponentContext(
            groupComponent,
            indexes?.Length > 0 ? indexes : null,
            defaultDataElementIdentifier,
            children
        );
    }

    private async Task<ComponentContext> GenerateContextForRepeatingGroup(
        DataModel dataModel,
        RepeatingGroupComponent repeatingGroupComponent,
        DataElementIdentifier defaultDataElementIdentifier,
        int[]? indexes
    )
    {
        var children = new List<ComponentContext>();
        if (repeatingGroupComponent.DataModelBindings.TryGetValue("group", out var groupBinding))
        {
            var repeatingGroupRowComponent = new RepeatingGroupRowComponent(
                $"{repeatingGroupComponent.Id}_{Guid.NewGuid()}", // Ensure globally unique id (consider using altinnRowId)
                repeatingGroupComponent.DataModelBindings,
                repeatingGroupComponent.HiddenRow,
                repeatingGroupComponent
            );
            var rowLength = await dataModel.GetModelDataCount(groupBinding, defaultDataElementIdentifier, indexes) ?? 0;
            // We add rows in reverse order, so that we can remove them without affecting the indexes of the remaining rows
            foreach (var index in Enumerable.Range(0, rowLength).Reverse())
            {
                // concatenate [...indexes, index]
                var subIndexes = new int[(indexes?.Length ?? 0) + 1];
                indexes?.CopyTo(subIndexes.AsSpan());
                subIndexes[^1] = index;

                var rowChildren = new List<ComponentContext>();
                foreach (var child in repeatingGroupComponent.Children)
                {
                    rowChildren.Add(
                        await GenerateComponentContextsRecurs(
                            child,
                            dataModel,
                            defaultDataElementIdentifier,
                            subIndexes
                        )
                    );
                }

                children.Add(
                    new ComponentContext(
                        repeatingGroupRowComponent,
                        subIndexes,
                        defaultDataElementIdentifier,
                        rowChildren
                    )
                );
            }
        }

        return new ComponentContext(
            repeatingGroupComponent,
            indexes?.Length > 0 ? indexes : null,
            defaultDataElementIdentifier,
            children
        );
    }

    private async Task<ComponentContext> GenerateContextForSubComponent(
        DataModel dataModel,
        SubFormComponent subFormComponent,
        DataElementIdentifier defaultDataElementIdentifier
    )
    {
        List<ComponentContext> children = [];
        var layoutSetId = subFormComponent.LayoutSetId;
        var layout = _layoutsLookup[layoutSetId];
        var dataElementsForSubForm = dataModel.Instance.Data.Where(d => d.DataType == layout.DefaultDataType.Id);
        foreach (var dataElement in dataElementsForSubForm)
        {
            List<ComponentContext> subForms = [];

            foreach (var page in layout.Pages)
            {
                subForms.Add(await GenerateComponentContextsRecurs(page, dataModel, dataElement, indexes: null));
            }

            children.Add(new ComponentContext(subFormComponent, null, dataElement, subForms));
        }

        return new ComponentContext(subFormComponent, null, defaultDataElementIdentifier, children);
    }

    internal DataElementIdentifier? GetDefaultDataElementId(Instance instance)
    {
        return _defaultLayoutSet.GetDefaultDataElementId(instance);
    }
}
