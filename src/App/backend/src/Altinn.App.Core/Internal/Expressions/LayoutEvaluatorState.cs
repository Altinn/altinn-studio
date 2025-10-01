using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.DataModel;
using Altinn.App.Core.Internal.Texts;
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
    private readonly ITranslationService _translationService;
    private readonly FrontEndSettings _frontEndSettings;
    private readonly Instance _instanceContext;
    private readonly string? _gatewayAction;
    private readonly string? _language;
    private readonly TimeZoneInfo? _timeZone;
    private readonly Lazy<Task<List<ComponentContext>>?> _rootContext;

    /// <summary>
    /// Constructor for LayoutEvaluatorState. Usually called via <see cref="LayoutEvaluatorStateInitializer" /> that can be fetched from dependency injection.
    /// </summary>
    /// <param name="dataAccessor">Accessor for the instance data</param>
    /// <param name="componentModel">The component model for the current layout</param>
    /// <param name="translationService">Translation service to implement ["text"] expressions</param>
    /// <param name="frontEndSettings">The frontend settings for the current app</param>
    /// <param name="gatewayAction">The gateway action (only for gateways)</param>
    /// <param name="language">The language of the instance viewer</param>
    /// <param name="timeZone">The timezone of the instance viewer</param>
    public LayoutEvaluatorState(
        IInstanceDataAccessor dataAccessor,
        LayoutModel? componentModel,
        ITranslationService translationService,
        FrontEndSettings frontEndSettings,
        string? gatewayAction = null,
        string? language = null,
        TimeZoneInfo? timeZone = null
    )
    {
        _dataModel = new DataModel(dataAccessor);
        _componentModel = componentModel;
        _translationService = translationService;
        _frontEndSettings = frontEndSettings;
        _instanceContext = dataAccessor.Instance;
        _gatewayAction = gatewayAction;
        _language = language;
        _timeZone = timeZone;
        _rootContext = new(() => _componentModel?.GenerateComponentContexts(_instanceContext, _dataModel));
    }

    /// <summary>
    /// Get a hierarchy of the different contexts in the component model (remember to iterate <see cref="ComponentContext.ChildContexts" />)
    /// </summary>
    public async Task<List<ComponentContext>> GetComponentContexts()
    {
        if (_rootContext.Value is null)
        {
            throw new InvalidOperationException("Component model not loaded");
        }
        return (await _rootContext.Value);
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
    public string GetLanguage() => _language ?? "nb";

    /// <summary>
    /// Gets the current timezone
    /// </summary>
    public TimeZoneInfo? GetTimeZone() => _timeZone;

    /// <summary>
    /// Get component from componentModel
    /// </summary>
    public BaseComponent GetComponent(string pageName, string componentId)
    {
        return _componentModel?.GetComponent(pageName, componentId)
            ?? throw new InvalidOperationException("Component model not loaded");
    }

    /// <summary>
    /// Get a specific component context based on
    /// </summary>
    public async Task<ComponentContext?> GetComponentContext(
        string pageName,
        string componentId,
        int[]? rowIndexes = null
    )
    {
        if (_componentModel is null)
        {
            throw new InvalidOperationException("Component model not loaded");
        }

        var contexts = (await GetComponentContexts()).SelectMany(c => c.Descendants);

        // Filter out all contexts that have the wrong Id
        contexts = contexts.Where(c => c.Component?.Id == componentId);
        // Filter out contexts that does not have a prefix matching
        var filteredContexts = contexts.Where(c => CompareRowIndexes(c.RowIndices, rowIndexes)).ToArray();
        if (filteredContexts.Length == 0)
        {
            return null; // No context found
        }

        if (filteredContexts.Length == 1)
        {
            return filteredContexts[0];
        }
        if (filteredContexts.Count(c => c.Component?.PageId == pageName) == 1)
        {
            // look first at the current page in case of duplicate ids (for backwards compatibility).
            return filteredContexts.First(c => c.Component?.PageId == pageName);
        }

        throw new InvalidOperationException(
            $"Multiple contexts found for {componentId} with [{(rowIndexes is null ? "" : string.Join(", ", rowIndexes))}]"
        );
    }

    private static bool CompareRowIndexes(int[]? targetRowIndexes, int[]? sourceRowIndexes)
    {
        if (targetRowIndexes is null)
        {
            return true;
        }
        if (sourceRowIndexes is null)
        {
            return false;
        }
        for (int i = 0; i < targetRowIndexes.Length; i++)
        {
            if (targetRowIndexes[i] != sourceRowIndexes[i])
            {
                return false;
            }
        }
        return true;
    }

    /// <summary>
    /// Get field from dataModel with key and context
    /// </summary>
    public async Task<object?> GetModelData(
        ModelBinding key,
        DataElementIdentifier defaultDataElementIdentifier,
        int[]? indexes
    )
    {
        return await _dataModel.GetModelData(key, defaultDataElementIdentifier, indexes);
    }

    /// <summary>
    /// Get all the resolved keys (including all possible indexes) from a data model key
    /// </summary>
    public async Task<DataReference[]> GetResolvedKeys(DataReference reference)
    {
        return await _dataModel.GetResolvedKeys(reference);
    }

    /// <summary>
    /// Set the value of a field to null.
    /// </summary>
    public async Task RemoveDataField(DataReference key, RowRemovalOption rowRemovalOption)
    {
        await _dataModel.RemoveField(key, rowRemovalOption);
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
            "instanceOwnerPartyType" => (
                !string.IsNullOrWhiteSpace(_instanceContext.InstanceOwner.OrganisationNumber) ? "org"
                : !string.IsNullOrWhiteSpace(_instanceContext.InstanceOwner.PersonNumber) ? "person"
                : !string.IsNullOrWhiteSpace(_instanceContext.InstanceOwner.Username) ? "selfIdentified"
                : "unknown"
            ),
            _ => throw new ExpressionEvaluatorTypeErrorException($"Unknown Instance context property {key}"),
        };
    }

    /// <summary>
    /// Count the number of data elements of a specific type
    /// </summary>
    public int CountDataElements(string dataTypeId)
    {
        return _instanceContext.Data.Count(d => d.DataType == dataTypeId);
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
    public async Task<DataReference> AddInidicies(ModelBinding binding, ComponentContext context)
    {
        return await _dataModel.AddIndexes(binding, context.DataElementIdentifier, context.RowIndices);
    }

    /// <summary>
    /// Return a full dataModelBiding from a context aware binding by adding indexes
    /// </summary>
    public async Task<DataReference> AddInidicies(
        ModelBinding binding,
        DataElementIdentifier dataElementIdentifier,
        int[]? indexes
    )
    {
        return await _dataModel.AddIndexes(binding, dataElementIdentifier, indexes);
    }

    /// <summary>
    /// This is the wrong abstraction, but used in tests that work
    /// </summary>
    internal DataElementIdentifier GetDefaultDataElementId()
    {
        return _componentModel?.GetDefaultDataElementId(_instanceContext)
            ?? throw new InvalidOperationException("Component model not loaded");
    }

    /// <summary>
    /// Translates the given text based on the current language setting.
    /// If no translation is available or the language is not defined, the input text is returned.
    /// </summary>
    /// <returns>The translated text if a translation is available; otherwise, the original textKey.</returns>
    public async Task<string> TranslateText(string textKey, ComponentContext context)
    {
        return await _translationService.TranslateTextKey(textKey, this, context) ?? textKey;
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
}
