using Altinn.App.Core.Configuration;
using Altinn.App.Core.Helpers.DataModel;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Expressions;

/// <summary>
/// Collection class to hold all the shared state that is required for evaluating expressions in a layout.
/// </summary>
public class LayoutEvaluatorState
{
    private readonly DataModel _dataModel;
    private readonly LayoutModel? _componentModel;
    private readonly DataElementId _defaultDataElementId;
    private readonly FrontEndSettings _frontEndSettings;
    private readonly Instance _instanceContext;
    private readonly string? _gatewayAction;
    private readonly string? _language;

    /// <summary>
    /// Constructor for LayoutEvaluatorState. Usually called via <see cref="LayoutEvaluatorStateInitializer" /> that can be fetched from dependency injection.
    /// </summary>
    public LayoutEvaluatorState(
        DataModel dataModel,
        LayoutModel componentModel,
        FrontEndSettings frontEndSettings,
        Instance instance,
        string? gatewayAction = null,
        string? language = null
    )
    {
        _dataModel = dataModel;
        _componentModel = componentModel;
        _frontEndSettings = frontEndSettings;
        _instanceContext = instance;
        _gatewayAction = gatewayAction;
        _language = language;
        var defaultDataType = _componentModel.DefaultDataType.Id;
        _defaultDataElementId =
            _instanceContext.Data.Find(d => d.DataType == defaultDataType)
            ?? throw new ArgumentException($"Could not find data element with data type {defaultDataType}");
    }

    /// <summary>
    /// Get a hierarchy of the different contexts in the component model (remember to iterate <see cref="ComponentContext.ChildContexts" />)
    /// </summary>
    public async Task<IEnumerable<ComponentContext>> GetComponentContexts()
    {
        var contexts = await Task.WhenAll(
            _componentModel.Pages.Values.Select(
                (async (page) => await GeneratePageContext(page, _dataModel, _defaultDataElementId))
            )
        );

        await EvaluateHiddenExpressions(contexts);
        return contexts;
    }

    private static async Task<ComponentContext> GeneratePageContext(
        PageComponent page,
        DataModel dataModel,
        DataElementId dataElementId
    )
    {
        var children = new List<ComponentContext>();
        foreach (var child in page.Children)
        {
            children.Add(await GenerateComponentContextsRecurs(child, dataModel, dataElementId, []));
        }

        return new ComponentContext(page, null, null, dataElementId, children);
    }

    private static async Task<ComponentContext> GenerateComponentContextsRecurs(
        BaseComponent component,
        DataModel dataModel,
        DataElementId defaultDataElementId,
        int[]? indexes
    )
    {
        var children = new List<ComponentContext>();
        int? rowLength = null;

        if (
            true /*TODO: type is subform*/
        ) { }
        if (component is RepeatingGroupComponent repeatingGroupComponent)
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

        return new ComponentContext(
            component,
            indexes?.Length > 0 ? indexes : null,
            rowLength,
            defaultDataElementId,
            children
        );
    }

    /// <summary>
    /// Get frontend setting with specified key
    /// </summary>
    public string? GetFrontendSetting(string key)
    {
        return _frontEndSettings.GetValueOrDefault(key);
    }

    /// <summary>
    /// Gets the current language of the instance viewer
    /// </summary>
    public string? GetLanguage() => _language;

    /// <summary>
    /// Get component from componentModel
    /// </summary>
    public BaseComponent GetComponent(string pageName, string componentId)
    {
        return _componentModel.GetComponent(pageName, componentId);
    }

    /// <summary>
    /// Get a specific component context based on
    /// </summary>
    public async Task<ComponentContext> GetComponentContext(
        string pageName,
        string componentId,
        DataElementId defaultDataElementId,
        int[]? rowIndexes = null
    )
    {
        // First look only on the relevant page
        _componentModel.Pages.TryGetValue(pageName, out var page);
        if (page is null)
        {
            throw new ArgumentException($"Unknown page name {pageName}");
        }
        page.ComponentLookup.TryGetValue(componentId, out var component);
        if (component is null)
        {
            // Look for component on other pages
            component = _componentModel
                .Pages.Values.Select(p => p.ComponentLookup.GetValueOrDefault(componentId))
                .Single(c => c is not null);
        }

        if (component is null)
        {
            throw new ArgumentException($"Unknown component id {componentId}");
        }

        return await GenerateComponentContextsRecurs(component, _dataModel, defaultDataElementId, rowIndexes);
    }

    /// <summary>
    /// Get field from dataModel with key and context
    /// </summary>
    public async Task<object?> GetModelData(ModelBinding key, DataElementId defaultDataElementId, int[]? indexes)
    {
        return await _dataModel.GetModelData(key, defaultDataElementId, indexes);
    }

    /// <summary>
    /// Get all of the resolved keys (including all possible indexes) from a data model key
    /// </summary>
    public async Task<DataReference[]> GetResolvedKeys(DataReference reference)
    {
        return await _dataModel.GetResolvedKeys(reference);
    }

    /// <summary>
    /// Set the value of a field to null.
    /// </summary>
    public void RemoveDataField(ModelBinding key, DataElementId dataElementId, RowRemovalOption rowRemovalOption)
    {
        _dataModel.RemoveField(key, dataElementId, rowRemovalOption);
    }

    /// <summary>
    /// Lookup variables in instance. Only a limited set is supported
    /// </summary>
    public string GetInstanceContext(string key)
    {
        // Instance context only supports a small subset of variables from the instance
        return key switch
        {
            "instanceOwnerPartyId" => _instanceContext.InstanceOwner.PartyId,
            "appId" => _instanceContext.AppId,
            "instanceId" => _instanceContext.Id,
            "instanceOwnerPartyType"
                => (
                    !string.IsNullOrWhiteSpace(_instanceContext.InstanceOwner.OrganisationNumber)
                        ? "org"
                        : !string.IsNullOrWhiteSpace(_instanceContext.InstanceOwner.PersonNumber)
                            ? "person"
                            : !string.IsNullOrWhiteSpace(_instanceContext.InstanceOwner.Username)
                                ? "selfIdentified"
                                : "unknown"
                ),
            _ => throw new ExpressionEvaluatorTypeErrorException($"Unknown Instance context property {key}"),
        };
    }

    /// <summary>
    /// Get the gateway action from the instance context
    /// </summary>
    /// <returns>Returns null if no action defined</returns>
    public string? GetGatewayAction()
    {
        return _gatewayAction;
    }

    /// <summary>
    /// Return a full dataModelBiding from a context aware binding by adding indicies
    /// </summary>
    /// <example>
    /// key = "bedrift.ansatte.navn"
    /// indicies = [1,2]
    /// => "bedrift[1].ansatte[2].navn"
    /// </example>
    public async Task<ModelBinding> AddInidicies(ModelBinding binding, ComponentContext context)
    {
        return await _dataModel.AddIndexes(binding, context.DataElementId, context.RowIndices);
    }

    /// <summary>
    /// Return a full dataModelBiding from a context aware binding by adding indexes
    /// </summary>
    public async Task<ModelBinding> AddInidicies(ModelBinding binding, DataElementId dataElementId, int[]? indexes)
    {
        return await _dataModel.AddIndexes(binding, dataElementId, indexes);
    }

    // /// <summary>
    // /// Verify all components that dataModel references are correct
    // /// </summary>
    // public List<string> GetModelErrors()
    // {
    //     var errors = new List<string>();
    //     foreach (var context in GetComponentContexts())
    //     {
    //         var component = context.Component;
    //         GetModelErrorsForExpression(component.Hidden, component, errors);
    //         GetModelErrorsForExpression(component.Required, component, errors);
    //         GetModelErrorsForExpression(component.ReadOnly, component, errors);
    //         foreach (var (bindingName, binding) in component.DataModelBindings)
    //         {
    //             if (!_dataModel.VerifyKey(binding, context.DataElementId))
    //             {
    //                 errors.Add($"Invalid binding \"{binding}\" on component {component.PageId}.{component.Id}");
    //             }
    //         }
    //     }
    //     return errors;
    // }

    // private void GetModelErrorsForExpression(Expression expr, BaseComponent component, List<string> errors)
    // {
    //     if (!expr.IsFunctionExpression)
    //     {
    //         return;
    //     }
    //
    //     if (expr.Function == ExpressionFunction.dataModel)
    //     {
    //         if (expr.Args.Count != 1 || expr.Args[0].Value is not string binding)
    //         {
    //             errors.Add(
    //                 $"function \"dataModel\" requires a single string argument on component {component.PageId}.{component.Id}"
    //             );
    //             return;
    //         }
    //         var dataType = expr.Args.ElementAtOrDefault(1).Value as string;
    //         if (!_dataModel.VerifyKey(new ModelBinding { Field = binding, DataType = dataType }, dataElementId))
    //         {
    //             errors.Add($"Invalid binding \"{binding}\" on component {component.PageId}.{component.Id}");
    //         }
    //         return;
    //     }
    //
    //     // check args recursively
    //     foreach (var arg in expr.Args)
    //     {
    //         GetModelErrorsForExpression(arg, component, errors);
    //     }
    // }

    private async Task EvaluateHiddenExpressions(IEnumerable<ComponentContext> contexts)
    {
        foreach (var context in contexts)
        {
            await EvaluateHiddenExpressionRecurs(context);
        }
    }

    private async Task EvaluateHiddenExpressionRecurs(ComponentContext context, bool parentIsHidden = false)
    {
        var hidden =
            parentIsHidden || await ExpressionEvaluator.EvaluateBooleanExpression(this, context, "hidden", false);
        context.IsHidden = hidden;

        if (
            context.Component is RepeatingGroupComponent repGroup
            && context.RowLength is not null
            && repGroup.HiddenRow.IsFunctionExpression
        )
        {
            var hiddenRows = new List<int>();
            foreach (var index in Enumerable.Range(0, context.RowLength.Value))
            {
                var rowIndices = context.RowIndices?.Append(index).ToArray() ?? [index];
                var childContexts = context.ChildContexts.Where(c => c.RowIndices?[^1] == index);
                var rowContext = new ComponentContext(
                    context.Component,
                    rowIndices,
                    rowLength: null,
                    dataElementId: context.DataElementId,
                    childContexts: childContexts
                );
                var rowHidden = await ExpressionEvaluator.EvaluateBooleanExpression(
                    this,
                    rowContext,
                    "hiddenRow",
                    false
                );
                if (rowHidden)
                {
                    hiddenRows.Add(index);
                }
            }
            context.HiddenRows = hiddenRows.ToArray();
        }

        foreach (var childContext in context.ChildContexts)
        {
            var rowIsHidden = false;
            if (context.HiddenRows is not null)
            {
                var currentRow = childContext.RowIndices?.Last();
                rowIsHidden = currentRow is not null && context.HiddenRows.Contains(currentRow.Value);
            }
            await EvaluateHiddenExpressionRecurs(childContext, hidden || rowIsHidden);
        }
    }

    public DataElementId GetDefaultElementId()
    {
        return _defaultDataElementId;
    }
}
