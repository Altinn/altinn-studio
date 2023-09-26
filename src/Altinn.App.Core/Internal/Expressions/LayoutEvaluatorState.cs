using Altinn.App.Core.Configuration;
using Altinn.App.Core.Helpers;
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
    private readonly IDataModelAccessor _dataModel;
    private readonly LayoutModel _componentModel;
    private readonly FrontEndSettings _frontEndSettings;
    private readonly Instance _instanceContext;
    private readonly ComponentContext[]? _pageContexts;

    /// <summary>
    /// Constructor for LayoutEvaluatorState. Usually called via <see cref="LayoutEvaluatorStateInitializer" /> that can be fetched from dependency injection.
    /// </summary>
    public LayoutEvaluatorState(IDataModelAccessor dataModel, LayoutModel componentModel, FrontEndSettings frontEndSettings, Instance instance)
    {
        _dataModel = dataModel;
        _componentModel = componentModel;
        _frontEndSettings = frontEndSettings;
        _instanceContext = instance;

        if (dataModel is not null && componentModel is not null)
        {
            _pageContexts = GenerateComponentContexts(dataModel, componentModel);
            EvaluateHiddenExpressions();
        }
    }

    /// <summary>
    /// Get a hierarcy of the different contexts in the component model (remember to iterate <see cref="ComponentContext.ChildContexts" />)
    /// </summary>
    public IEnumerable<ComponentContext> GetComponentContexts()
    {
        if (_pageContexts is null)
        {
            throw new ArgumentException("ComponentContexts have not been generated");
        }
        return _pageContexts;
    }

    private static ComponentContext[] GenerateComponentContexts(IDataModelAccessor dataModel, LayoutModel componentModel)
    {
        return componentModel
            .Pages
            .Values
            .Select((
            (page) => GeneratePageContext(page, dataModel)
        )).ToArray();
    }

    private static ComponentContext GeneratePageContext(PageComponent page, IDataModelAccessor dataModel) => new ComponentContext
            (
                page,
                null,
                null,
                page.Children.Select(c => GenerateComponentContextsRecurs(c, dataModel, Array.Empty<int>())).ToArray()
            );


    private static ComponentContext GenerateComponentContextsRecurs(BaseComponent component, IDataModelAccessor dataModel, ReadOnlySpan<int> indexes)
    {
        var children = new List<ComponentContext>();
        int? rowLength = null;

        if (component is RepeatingGroupComponent repeatingGroupComponent)
        {
            if (repeatingGroupComponent.DataModelBindings.TryGetValue("group", out var groupBinding))
            {
                rowLength = dataModel.GetModelDataCount(groupBinding, indexes.ToArray()) ?? 0;
                foreach (var index in Enumerable.Range(0, rowLength.Value))
                {
                    foreach (var child in repeatingGroupComponent.Children)
                    {
                        // concatenate [...indexes, index]
                        var subIndexes = new int[indexes.Length + 1];
                        indexes.CopyTo(subIndexes.AsSpan());
                        subIndexes[^1] = index;

                        children.Add(GenerateComponentContextsRecurs(child, dataModel, subIndexes));
                    }
                }
            }
        }
        else if (component is GroupComponent groupComponent)
        {
            foreach (var child in groupComponent.Children)
            {
                children.Add(GenerateComponentContextsRecurs(child, dataModel, indexes));
            }
        }

        return new ComponentContext(component, ToArrayOrNullForEmpty(indexes), rowLength, children);
    }

    private static T[]? ToArrayOrNullForEmpty<T>(ReadOnlySpan<T> span)
    {
        return span.Length > 0 ? span.ToArray() : null;
    }

    /// <summary>
    /// Get frontend setting with specified key
    /// </summary>
    public string? GetFrontendSetting(string key)
    {
        return _frontEndSettings.TryGetValue(key, out var setting) ? setting : null;
    }

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
    public ComponentContext GetComponentContext(string pageName, string componentId, int[]? rowIndicies = null)
    {
        if (_pageContexts is null)
        {
            throw new ArgumentException("ComponentContexts have not been generated");
        }
        // First look only on the relevant page
        var pageContext = _pageContexts.FirstOrDefault(c => c.Component.Id == pageName);
        if (pageContext is null)
        {
            throw new ArgumentException($"Unknown page name {pageName}");
        }
        // Find all decendent contexts that matches componentId and all the given rowIndicies
        var matches = pageContext.Decendants.Where(
                            context =>
                                context.Component.Id == componentId &&
                                (context.RowIndices?.Zip(rowIndicies ?? Enumerable.Empty<int>()).All((i) => i.First == i.Second) ?? true)).ToArray();
        if (matches.Length == 1)
        {
            return matches[0];
        }
        else if (matches.Length > 1)
        {
            throw new ArgumentException($"Expected 1 matching component context for [\"component\"] lookup on page {pageName}. Found {matches.Length}");
        }

        // If no components was found on the same page, look for component on all pages
        // Find all decendent contexts that matches componentId and all the given rowIndicies
        matches = _pageContexts.SelectMany(p => p.Decendants.Where(
                            context =>
                                context.Component.Id == componentId &&
                                (context.RowIndices?.Zip(rowIndicies ?? Enumerable.Empty<int>()).All((i) => i.First == i.Second) ?? true))).ToArray();
        if (matches.Length != 1)
        {
            throw new ArgumentException("Expected 1 matching component context for [\"component\"] lookup. Found " + matches.Length);
        }
        return matches[0];
    }

    /// <summary>
    /// Get field from dataModel with key and context
    /// </summary>
    public object? GetModelData(string? key, ComponentContext? context = null)
    {
        if (key is null)
        {
            throw new ArgumentException("Cannot lookup dataModel null");
        }

        return _dataModel.GetModelData(key, context?.RowIndices);
    }

    /// <summary>
    /// Set the value of a field to null.
    /// </summary>
    public void RemoveDataField(string key, RowRemovalOption rowRemovalOption)
    {
        _dataModel.RemoveField(key, rowRemovalOption);
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
            "instanceOwnerPartyType" =>
            (
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
    /// Return a full dataModelBiding from a context aware binding by adding indicies
    /// </summary>
    /// <example>
    /// key = "bedrift.ansatte.navn"
    /// indicies = [1,2]
    /// => "bedrift[1].ansatte[2].navn"
    /// </example>
    public string AddInidicies(string binding, ComponentContext context)
    {
        return _dataModel.AddIndicies(binding, context.RowIndices);
    }

    /// <summary>
    /// Return a full dataModelBiding from a context aware binding by adding indicies
    /// </summary>
    public string AddInidicies(string binding, ReadOnlySpan<int> indices)
    {
        return _dataModel.AddIndicies(binding, indices);
    }

    /// <summary>
    /// Verify all components that dataModel references are correct
    /// </summary>
    public List<string> GetModelErrors()
    {
        var errors = new List<string>();
        foreach (var component in _componentModel.GetComponents())
        {
            GetModelErrorsForExpression(component.Hidden, component, errors);
            GetModelErrorsForExpression(component.Required, component, errors);
            GetModelErrorsForExpression(component.ReadOnly, component, errors);
            foreach (var (bindingName, binding) in component.DataModelBindings)
            {
                if (!_dataModel.VerifyKey(binding))
                {
                    errors.Add($"Invalid binding \"{binding}\" on component {component.PageId}.{component.Id}");
                }
            }
        }
        return errors;
    }

    private void GetModelErrorsForExpression(Expression? expr, BaseComponent component, List<string> errors)
    {
        if (expr == null || expr.Value != null || expr.Args == null || expr.Function == null)
        {
            return;
        }

        if (expr.Function == ExpressionFunction.dataModel)
        {
            if (expr.Args.Count != 1 || expr.Args[0].Value is not string binding)
            {
                errors.Add($"function \"dataModel\" requires a single string argument on component {component.PageId}.{component.Id}");
                return;
            }
            if (!_dataModel.VerifyKey(binding))
            {
                errors.Add($"Invalid binding \"{binding}\" on component {component.PageId}.{component.Id}");
            }
            return;
        }

        // check args recursivly
        foreach (var arg in expr.Args)
        {
            GetModelErrorsForExpression(arg, component, errors);
        }
    }

    private void EvaluateHiddenExpressions()
    {
        foreach (var context in GetComponentContexts())
        {
            EvaluateHiddenExpressionRecurs(context);
        }
    }

    private void EvaluateHiddenExpressionRecurs(ComponentContext context, bool parentIsHidden = false)
    {
        var hidden = parentIsHidden || ExpressionEvaluator.EvaluateBooleanExpression(this, context, "hidden", false);
        context.IsHidden = hidden;

        if (context.Component is RepeatingGroupComponent repGroup && context.RowLength is not null && repGroup.HiddenRow is not null)
        {
            var hiddenRows = new List<int>();
            foreach (var index in Enumerable.Range(0, context.RowLength.Value))
            {
                var rowIndices = context.RowIndices?.Append(index).ToArray() ?? new[] { index };
                var childContexts = context.ChildContexts.Where(c => c.RowIndices?.Last() == index);
                var rowContext = new ComponentContext(context.Component, rowIndices, null, childContexts);
                var rowHidden = ExpressionEvaluator.EvaluateBooleanExpression(this, rowContext, "hiddenRow", false);
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
            EvaluateHiddenExpressionRecurs(childContext, hidden || rowIsHidden);
        }
    }
}
