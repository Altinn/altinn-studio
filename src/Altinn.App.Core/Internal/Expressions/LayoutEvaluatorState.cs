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
/// This will gradually be removed and replaced by IInstanceDataAccessor
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
        DataAccessor = dataAccessor;
        _componentModel = componentModel;
        _translationService = translationService;
        _frontEndSettings = frontEndSettings;
        Instance = dataAccessor.Instance;
        _gatewayAction = gatewayAction;
        _language = language ?? dataAccessor.Language;
        _timeZone = timeZone;
    }

    /// <summary>
    /// Get the Instance object that is referenced for evaluation.
    /// </summary>
    public Instance Instance { get; }

    /// <summary>
    /// Provides access to the instance data accessor, enabling operations and interactions
    /// with the underlying instance data used in layout evaluation and bindings.
    /// </summary>
    public IInstanceDataAccessor DataAccessor { get; }

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
            _rootContext = await _componentModel.GenerateComponentContexts(DataAccessor);
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
    /// Get a specific component context from the state relative to another contexts subform data element and row indexes.
    /// </summary>
    public async Task<ComponentContext?> GetComponentContext(string componentId, ComponentContext relativeContext)
    {
        if (_componentModel is null)
        {
            throw new InvalidOperationException("Component model not loaded");
        }

        var contexts = (await GetComponentContexts()).SelectMany(c => c.Descendants);

        if (relativeContext.DataElementIdentifier is not null)
        {
            // Filter out contexts that does not have the same data element identifier as the relative context, this ensures that we only get contexts from the same subform repeat group when there are multiple in the same layout
            contexts = contexts.Where(c => c.DataElementIdentifier == relativeContext.DataElementIdentifier);
        }
        // Filter out all contexts that have the wrong Id
        // Filter out contexts that does not have a prefix matching
        var filteredContexts = contexts
            .Where(c => c.Component?.Id == componentId)
            .Where(c => RowIndexMatch(relativeContext.RowIndices, c.RowIndices))
            .ToArray();
        if (filteredContexts.Length == 0)
        {
            return null; // No context found
        }

        if (filteredContexts.Length == 1)
        {
            return filteredContexts[0];
        }

        throw new InvalidOperationException(
            $"Multiple contexts found for {componentId} with [{(relativeContext.RowIndices is null ? "" : string.Join(", ", relativeContext.RowIndices))}]"
        );
    }

    /// <summary>
    /// Get a specific component context from the state
    /// </summary>
    [Obsolete(
        "A context is not uniquely identified by componentId and rowIndexes, use GetComponentContext(string, ComponentContext) instead so that we get subform data element as well."
    )]
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
        DataElementIdentifier? defaultDataElementIdentifier,
        int[]? indexes
    )
    {
        var model = await DataAccessor.GetFormDataWrapper(key, defaultDataElementIdentifier);
        return model?.Get(key.Field, indexes);
    }

    /// <summary>
    /// Get all the resolved keys (including all possible indexes) from a data model key
    /// </summary>
    public async Task<DataReference[]> GetResolvedKeys(DataReference reference)
    {
        var data = await DataAccessor.GetFormDataWrapper(reference.DataElementIdentifier);
        return data.GetResolvedKeys(reference);
    }

    /// <summary>
    /// Set the value of a field to null.
    /// </summary>
    public async Task RemoveDataField(DataReference key, RowRemovalOption rowRemovalOption)
    {
        var dataWrapper = await DataAccessor.GetFormDataWrapper(key.DataElementIdentifier);
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
            "instanceOwnerPartyType" => GetInstanceOwnerPartyType(Instance.InstanceOwner),
            _ => throw new ExpressionEvaluatorTypeErrorException($"Unknown Instance context property {key}"),
        };
    }

    private static string GetInstanceOwnerPartyType(InstanceOwner? instanceOwner)
    {
        return !string.IsNullOrWhiteSpace(instanceOwner?.OrganisationNumber) ? "org"
            : !string.IsNullOrWhiteSpace(instanceOwner?.PersonNumber) ? "person"
            : !string.IsNullOrWhiteSpace(instanceOwner?.Username) ? "selfIdentified"
            : "unknown";
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
        var formDataWrapper =
            await DataAccessor.GetFormDataWrapper(binding, context.DataElementIdentifier)
            ?? throw new NullReferenceException($"No data element found for {binding.DataType} {binding.Field}");

        if (formDataWrapper.DataElement == null)
        {
            throw new InvalidOperationException(
                $"The form data wrapper for {binding.DataType} {binding.Field} was resolved with a null data element, this should not happen"
            );
        }

        var field =
            formDataWrapper.AddIndexToPath(binding.Field, context.RowIndices)
            ?? throw new InvalidOperationException(
                $"Failed to add indexes to path {binding.Field} with indexes "
                    + $"{(context.RowIndices is null ? "null" : string.Join(", ", context.RowIndices))} on {formDataWrapper.DataElement?.Id}"
            );

        return new DataReference() { Field = field, DataElementIdentifier = formDataWrapper.DataElement };
    }

    /// <summary>
    /// Return a full dataModelBinding from a context aware binding by adding indexes
    /// </summary>
    [Obsolete(
        "This method is deprecated and will be removed in a future version in favor of AddInidicies(ModelBinding, ComponentContext)."
    )]
    public async Task<DataReference> AddInidicies(
        ModelBinding binding,
        DataElementIdentifier dataElementIdentifier,
        int[]? indexes
    )
    {
        var formDataWrapper =
            await DataAccessor.GetFormDataWrapper(binding, dataElementIdentifier)
            ?? throw new NullReferenceException($"No data element found for {binding.DataType} {binding.Field}");

        if (formDataWrapper.DataElement == null)
        {
            throw new InvalidOperationException(
                $"The form data wrapper for {binding.DataType} {binding.Field} was resolved with a null data element, this should not happen"
            );
        }

        return new DataReference()
        {
            DataElementIdentifier = formDataWrapper.DataElement,
            Field =
                formDataWrapper.AddIndexToPath(binding.Field, indexes)
                ?? throw new InvalidOperationException(
                    $"Failed to add indexes to path {binding.Field} with indexes {(indexes == null ? "null" : string.Join(", ", indexes))} on {formDataWrapper.DataElement?.Id}"
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
        return await _translationService.TranslateTextKey(textKey, DataAccessor, context) ?? textKey;
    }

    internal async Task<int?> GetModelDataCount(
        ModelBinding groupBinding,
        DataElementIdentifier defaultDataElementIdentifier,
        int[]? indexes
    )
    {
        var model = await DataAccessor.GetFormDataWrapper(groupBinding, defaultDataElementIdentifier);
        return model?.GetRowCount(groupBinding.Field, indexes);
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
    //     if (expr.IsLiteralValue)
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

    /// <summary>
    /// Get the default data type from the current layoutset
    /// </summary>
    public DataType? GetDefaultDataType()
    {
        return _componentModel?.DefaultDataType;
    }

    internal LayoutEvaluatorState WithDataAccessor(IInstanceDataAccessor dataAccessor)
    {
        return new LayoutEvaluatorState(
            dataAccessor,
            _componentModel,
            _translationService,
            _frontEndSettings,
            _gatewayAction,
            _language,
            _timeZone
        );
    }
}
