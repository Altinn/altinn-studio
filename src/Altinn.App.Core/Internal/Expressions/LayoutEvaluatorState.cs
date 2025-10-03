using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Expressions;

/// <summary>
/// Collection class to hold all the shared state that is required for evaluating expressions in a layout.
/// </summary>
public class LayoutEvaluatorState
{
    private readonly LayoutModel? _componentModel;
    private readonly ITranslationService _translationService;
    private readonly FrontEndSettings _frontEndSettings;
    private readonly string? _gatewayAction;
    private readonly string? _language;
    private readonly TimeZoneInfo? _timeZone;
    private List<ComponentContext>? _rootContext;
    private readonly IInstanceDataAccessor _dataAccessor;
    private readonly Dictionary<string, DataElementIdentifier> _dataIdsByType = [];

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
        // Precompute a map of data types to data element ids for all single-instance data types
        // This is used to resolve data element ids when a specific data type is requested in a binding
        foreach (var (dataType, dataElement) in dataAccessor.GetDataElements())
        {
            if (dataType is { MaxCount: 1, AppLogic.ClassRef: not null })
            {
                // There should never be duplicates because of MaxCount == 1, but just in case, we only want the first one
                _dataIdsByType.TryAdd(dataElement.DataType, dataElement);
            }
        }
        _dataAccessor = dataAccessor;
        _componentModel = componentModel;
        _translationService = translationService;
        _frontEndSettings = frontEndSettings;
        Instance = dataAccessor.Instance;
        _gatewayAction = gatewayAction;
        _language = language;
        _timeZone = timeZone;
    }

    /// <summary>
    /// Get the Instance object that is referenced for evaluation.
    /// </summary>
    public Instance Instance { get; }

    /// <summary>
    /// Get a hierarchy of the different contexts in the component model (remember to iterate <see cref="ComponentContext.ChildContexts" />)
    /// </summary>
    public async Task<List<ComponentContext>> GetComponentContexts()
    {
        if (_rootContext is null)
        {
            if (_componentModel is null)
            {
                throw new InvalidOperationException("Component model not loaded");
            }
            _rootContext = await _componentModel.GenerateComponentContexts(this);
        }
        return _rootContext;
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
    [Obsolete("You need to get a context, not a component", true)]
    public void GetComponent(string pageName, string componentId)
    {
        throw new NotSupportedException("GetComponent is not supported, use GetComponentContext instead.");
    }

    /// <summary>
    /// Get a specific component context from the state
    /// </summary>
    public async Task<ComponentContext?> GetComponentContext(
        string? pageName,
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
        var filteredContexts = contexts.Where(c => RowIndexMatch(rowIndexes, c.RowIndices)).ToArray();
        if (filteredContexts.Length == 0)
        {
            return null; // No context found
        }

        if (filteredContexts.Length == 1)
        {
            return filteredContexts[0];
        }

        if (pageName is not null && filteredContexts.Count(c => c.Component?.PageId == pageName) == 1)
        {
            // look first at the current page in case of duplicate ids (for backwards compatibility).
            return filteredContexts.First(c => c.Component?.PageId == pageName);
        }

        throw new InvalidOperationException(
            $"Multiple contexts found for {componentId} with [{(rowIndexes is null ? "" : string.Join(", ", rowIndexes))}]"
        );
    }

    private static bool RowIndexMatch(int[]? searchRowIndexes, int[]? componentRowIndexes)
    {
        if (componentRowIndexes is null)
        {
            return true;
        }
        if (searchRowIndexes is null)
        {
            return false;
        }

        if (searchRowIndexes.Length < componentRowIndexes.Length)
        {
            return false;
        }

        for (int i = 0; i < componentRowIndexes.Length; i++)
        {
            if (searchRowIndexes[i] != componentRowIndexes[i])
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
        var elementIdentifier = ResolveDataElementIdentifier(key, defaultDataElementIdentifier);
        var model = await _dataAccessor.GetFormDataWrapper(elementIdentifier);
        return model.Get(key.Field, indexes);
    }

    /// <summary>
    /// Get all the resolved keys (including all possible indexes) from a data model key
    /// </summary>
    public async Task<DataReference[]> GetResolvedKeys(DataReference reference)
    {
        var data = await _dataAccessor.GetFormDataWrapper(reference.DataElementIdentifier);
        return data.GetResolvedKeys(reference);
    }

    /// <summary>
    /// Set the value of a field to null.
    /// </summary>
    public async Task RemoveDataField(DataReference key, RowRemovalOption rowRemovalOption)
    {
        var dataWrapper = await _dataAccessor.GetFormDataWrapper(key.DataElementIdentifier);
        dataWrapper.RemoveField(key.Field, rowRemovalOption);
    }

    /// <summary>
    /// Lookup variables in instance. Only a limited set is supported
    /// </summary>
    public string GetInstanceContext(string key)
    {
        // Instance context only supports a small subset of variables from the instance
        return key switch
        {
            "instanceOwnerPartyId" => Instance.InstanceOwner?.PartyId
                ?? throw new InvalidOperationException("InstanceOwner or PartyId is null"),
            "appId" => Instance.AppId ?? throw new InvalidOperationException("AppId is null"),
            "instanceId" => Instance.Id ?? throw new InvalidOperationException("InstanceId is null"),
            "instanceOwnerPartyType" => (
                !string.IsNullOrWhiteSpace(Instance.InstanceOwner?.OrganisationNumber) ? "org"
                : !string.IsNullOrWhiteSpace(Instance.InstanceOwner?.PersonNumber) ? "person"
                : !string.IsNullOrWhiteSpace(Instance.InstanceOwner?.Username) ? "selfIdentified"
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
        return Instance.Data?.Count(d => d.DataType == dataTypeId) ?? 0;
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
    /// Return a full dataModelBinding from a context-aware binding by adding indexes
    /// </summary>
    /// <example>
    /// key = "bedrift.ansatte.navn"
    /// indexes = [1,2]
    /// => "bedrift[1].ansatte[2].navn"
    /// </example>
    public async Task<DataReference> AddInidicies(ModelBinding binding, ComponentContext context)
    {
        var dataElementId = ResolveDataElementIdentifier(binding, context.DataElementIdentifier);
        var formDataWrapper = await _dataAccessor.GetFormDataWrapper(dataElementId);

        var field =
            formDataWrapper.AddIndexToPath(binding.Field, context.RowIndices)
            ?? throw new InvalidOperationException(
                $"Failed to add indexes to path {binding.Field} with indexes "
                    + $"{(context.RowIndices is null ? "null" : string.Join(", ", context.RowIndices))} on {dataElementId}"
            );
        ;
        return new DataReference() { Field = field, DataElementIdentifier = dataElementId };
    }

    private DataElementIdentifier ResolveDataElementIdentifier(
        ModelBinding key,
        DataElementIdentifier defaultDataElementIdentifier
    )
    {
        // If the binding don't have a specific data type, use the default
        if (key.DataType == null)
        {
            return defaultDataElementIdentifier;
        }
        // If the data element has the same type as default, return it
        var defaultDataType = _dataAccessor.GetDataType(defaultDataElementIdentifier);
        if (defaultDataType.Id == key.DataType)
        {
            return defaultDataElementIdentifier;
        }

        // Return the correct element if the data type has a single element on the instance and MaxCount == 1
        if (_dataIdsByType.TryGetValue(key.DataType, out var dataElementId))
        {
            return dataElementId;
        }

        // Raise the correct error
        var requestedDataType = _dataAccessor.GetDataType(key.DataType);
        if (requestedDataType.AppLogic?.ClassRef is null)
        {
            throw new InvalidOperationException(
                $"{key.DataType} has no classRef in applicationmetadata.json and can't be used as a data model in layouts"
            );
        }
        if (requestedDataType.MaxCount != 1)
        {
            throw new InvalidOperationException(
                $"{key.DataType} has maxCount different from 1 in applicationmetadata.json and must be part of a subform when used in layouts"
            );
        }
        throw new InvalidOperationException($"Data element with type {key.DataType} not found on instance");
    }

    /// <summary>
    /// Return a full dataModelBinding from a context aware binding by adding indexes
    /// </summary>
    [Obsolete("This method is deprecated and will be removed in a future version.")]
    public async Task<DataReference> AddInidicies(
        ModelBinding binding,
        DataElementIdentifier dataElementIdentifier,
        int[]? indexes
    )
    {
        var dataElementId = ResolveDataElementIdentifier(binding, dataElementIdentifier);
        var formDataWrapper = await _dataAccessor.GetFormDataWrapper(dataElementId);
        return new DataReference()
        {
            DataElementIdentifier = dataElementId,
            Field =
                formDataWrapper.AddIndexToPath(binding.Field, indexes)
                ?? throw new InvalidOperationException(
                    $"Failed to add indexes to path {binding.Field} with indexes {(indexes == null ? "null" : string.Join(", ", indexes))} on {dataElementId}"
                ),
        };
    }

    /// <summary>
    /// This is the wrong abstraction, but used in tests that work
    /// </summary>
    internal DataElementIdentifier GetDefaultDataElementId()
    {
        return _componentModel?.GetDefaultDataElementId(Instance)
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

    internal async Task<int?> GetModelDataCount(
        ModelBinding groupBinding,
        DataElementIdentifier defaultDataElementIdentifier,
        int[]? indexes
    )
    {
        var dataElementId = ResolveDataElementIdentifier(groupBinding, defaultDataElementIdentifier);
        var model = await _dataAccessor.GetFormDataWrapper(dataElementId);
        return model.GetRowCount(groupBinding.Field, indexes);
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
