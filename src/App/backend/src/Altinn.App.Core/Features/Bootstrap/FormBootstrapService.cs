using System.Text.Json;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Features.Bootstrap;

/// <summary>
/// Implementation of <see cref="IFormBootstrapService"/> that aggregates all form data
/// into a single response.
/// </summary>
internal sealed class FormBootstrapService : IFormBootstrapService
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly IAppResources _appResources;
    private readonly IAppMetadata _appMetadata;
    private readonly ILayoutAnalysisService _layoutAnalysis;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly IDataClient _dataClient;
    private readonly IAppModel _appModel;
    private readonly ILogger<FormBootstrapService> _logger;

    public FormBootstrapService(
        IAppResources appResources,
        IAppMetadata appMetadata,
        ILayoutAnalysisService layoutAnalysis,
        AppImplementationFactory appImplementationFactory,
        IDataClient dataClient,
        IAppModel appModel,
        ILogger<FormBootstrapService> logger
    )
    {
        _appResources = appResources;
        _appMetadata = appMetadata;
        _layoutAnalysis = layoutAnalysis;
        _appImplementationFactory = appImplementationFactory;
        _dataClient = dataClient;
        _appModel = appModel;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<FormBootstrapResponse> GetInstanceFormBootstrap(
        Instance instance,
        string? layoutSetIdOverride,
        string? dataElementIdOverride,
        bool isPdf,
        string language,
        CancellationToken cancellationToken = default
    )
    {
        // 1. Determine layout set
        var layoutSetId = layoutSetIdOverride ?? GetLayoutSetFromProcess(instance);
        if (string.IsNullOrEmpty(layoutSetId))
        {
            throw new InvalidOperationException(
                $"Could not determine layout set for instance {instance.Id}. "
                    + "Ensure the instance has a current task with an associated layout set."
            );
        }

        var defaultDataType = await GetDefaultDataType(layoutSetId);
        var isSubform = layoutSetIdOverride is not null;

        // 2. Load layouts (needed for analysis)
        var layoutsJson = _appResources.GetLayoutsForSet(layoutSetId);
        var layouts = DeserializeJson(layoutsJson);
        var layoutSettings = GetLayoutSettings(layoutSetId);

        // 3. Analyze layouts
        var referencedDataTypes = _layoutAnalysis.GetReferencedDataTypes(layoutsJson, defaultDataType);
        var staticOptionIds = _layoutAnalysis.GetStaticOptionIds(layoutsJson);

        // 4. Load everything in parallel
        var dataModelsTask = LoadInstanceDataModels(
            instance,
            referencedDataTypes,
            dataElementIdOverride,
            isPdf,
            cancellationToken
        );
        var optionsTask = LoadStaticOptions(staticOptionIds, language);

        await Task.WhenAll(dataModelsTask, optionsTask);

        return new FormBootstrapResponse
        {
            Layouts = layouts,
            LayoutSettings = layoutSettings,
            DataModels = await dataModelsTask,
            StaticOptions = await optionsTask,
            ValidationIssues = null, // Validation handled separately
            Metadata = new FormBootstrapMetadata
            {
                LayoutSetId = layoutSetId,
                DefaultDataType = defaultDataType,
                IsSubform = isSubform,
                IsPdf = isPdf,
            },
        };
    }

    /// <inheritdoc />
    public async Task<FormBootstrapResponse> GetStatelessFormBootstrap(
        string layoutSetId,
        string language,
        CancellationToken cancellationToken = default
    )
    {
        var defaultDataType = await GetDefaultDataType(layoutSetId);

        // Load layouts
        var layoutsJson = _appResources.GetLayoutsForSet(layoutSetId);
        var layouts = DeserializeJson(layoutsJson);
        var layoutSettings = GetLayoutSettings(layoutSetId);

        // Analyze
        var referencedDataTypes = _layoutAnalysis.GetReferencedDataTypes(layoutsJson, defaultDataType);
        var staticOptionIds = _layoutAnalysis.GetStaticOptionIds(layoutsJson);

        // Load in parallel
        var dataModelsTask = LoadStatelessDataModels(referencedDataTypes, cancellationToken);
        var optionsTask = LoadStaticOptions(staticOptionIds, language);

        await Task.WhenAll(dataModelsTask, optionsTask);

        return new FormBootstrapResponse
        {
            Layouts = layouts,
            LayoutSettings = layoutSettings,
            DataModels = await dataModelsTask,
            StaticOptions = await optionsTask,
            ValidationIssues = null, // No validation for stateless
            Metadata = new FormBootstrapMetadata
            {
                LayoutSetId = layoutSetId,
                DefaultDataType = defaultDataType,
                IsSubform = false,
                IsPdf = false,
            },
        };
    }

    private static object DeserializeJson(string json)
    {
        return JsonSerializer.Deserialize<JsonElement>(json, _jsonSerializerOptions);
    }

    private string? GetLayoutSetFromProcess(Instance instance)
    {
        var taskId = instance.Process?.CurrentTask?.ElementId;
        if (string.IsNullOrEmpty(taskId))
        {
            return null;
        }

        var layoutSet = _appResources.GetLayoutSetForTask(taskId);
        return layoutSet?.Id;
    }

    private async Task<string> GetDefaultDataType(string layoutSetId)
    {
        var layoutSets = _appResources.GetLayoutSets();
        var layoutSet = layoutSets?.Sets?.FirstOrDefault(s =>
            string.Equals(s.Id, layoutSetId, StringComparison.OrdinalIgnoreCase)
        );

        if (!string.IsNullOrEmpty(layoutSet?.DataType))
        {
            return layoutSet.DataType;
        }

        // Fallback: use the first data type with app logic
        var appMetadata = await _appMetadata.GetApplicationMetadata();
        var defaultDataType = appMetadata.DataTypes.FirstOrDefault(dt => dt.AppLogic?.ClassRef is not null);

        return defaultDataType?.Id
            ?? throw new InvalidOperationException(
                $"No default data type found for layout set {layoutSetId}. "
                    + "Ensure at least one data type has AppLogic.ClassRef defined."
            );
    }

    private object? GetLayoutSettings(string layoutSetId)
    {
        var settingsString = _appResources.GetLayoutSettingsStringForSet(layoutSetId);
        if (string.IsNullOrEmpty(settingsString))
        {
            return null;
        }

        return JsonSerializer.Deserialize<JsonElement>(settingsString, _jsonSerializerOptions);
    }

    private async Task<Dictionary<string, DataModelInfo>> LoadInstanceDataModels(
        Instance instance,
        HashSet<string> dataTypes,
        string? specificDataElementId,
        bool isPdf,
        CancellationToken cancellationToken
    )
    {
        var result = new Dictionary<string, DataModelInfo>();
        var appMetadata = await _appMetadata.GetApplicationMetadata();

        var tasks = dataTypes.Select(async dataType =>
        {
            try
            {
                var dataTypeDef = appMetadata.DataTypes.FirstOrDefault(dt =>
                    string.Equals(dt.Id, dataType, StringComparison.OrdinalIgnoreCase)
                );

                if (dataTypeDef?.AppLogic?.ClassRef is null)
                {
                    _logger.LogWarning("Data type {DataType} missing AppLogic.ClassRef, skipping", dataType);
                    return (dataType, (DataModelInfo?)null);
                }

                // Find data element
                DataElement? dataElement;
                if (!string.IsNullOrEmpty(specificDataElementId))
                {
                    dataElement = instance.Data.FirstOrDefault(d =>
                        string.Equals(d.Id, specificDataElementId, StringComparison.OrdinalIgnoreCase)
                    );
                }
                else
                {
                    dataElement = instance.Data.FirstOrDefault(d =>
                        string.Equals(d.DataType, dataType, StringComparison.OrdinalIgnoreCase)
                    );
                }

                if (dataElement is null)
                {
                    _logger.LogDebug("No data element found for type {DataType}", dataType);
                    return (dataType, (DataModelInfo?)null);
                }

                // Load schema, data, and validation config
                var schema = GetSchema(dataType);
                var formData = await GetFormDataAsync(instance, dataElement, cancellationToken);
                var validationConfig = isPdf || dataElement.Locked ? null : GetValidationConfig(dataType);

                return (
                    dataType,
                    (DataModelInfo?)
                        new DataModelInfo
                        {
                            Schema = schema,
                            InitialData = formData,
                            DataElementId = dataElement.Id,
                            IsWritable = dataElement.Locked != true,
                            ExpressionValidationConfig = validationConfig,
                        }
                );
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to load data model for type {DataType}", dataType);
                return (dataType, (DataModelInfo?)null);
            }
        });

        var results = await Task.WhenAll(tasks);
        foreach (var (dataType, info) in results)
        {
            if (info is not null)
            {
                result[dataType] = info;
            }
        }

        return result;
    }

    private async Task<Dictionary<string, DataModelInfo>> LoadStatelessDataModels(
        HashSet<string> dataTypes,
        CancellationToken cancellationToken
    )
    {
        _ = cancellationToken; // Reserved for future use
        var result = new Dictionary<string, DataModelInfo>();
        var appMetadata = await _appMetadata.GetApplicationMetadata();

        foreach (var dataType in dataTypes)
        {
            try
            {
                var dataTypeDef = appMetadata.DataTypes.FirstOrDefault(dt =>
                    string.Equals(dt.Id, dataType, StringComparison.OrdinalIgnoreCase)
                );

                if (dataTypeDef?.AppLogic?.ClassRef is null)
                {
                    _logger.LogWarning("Data type {DataType} missing AppLogic.ClassRef, skipping", dataType);
                    continue;
                }

                var schema = GetSchema(dataType);
                var defaultData = GetDefaultFormData(dataTypeDef.AppLogic.ClassRef);
                var validationConfig = GetValidationConfig(dataType);

                result[dataType] = new DataModelInfo
                {
                    Schema = schema,
                    InitialData = defaultData,
                    DataElementId = null,
                    IsWritable = true,
                    ExpressionValidationConfig = validationConfig,
                };
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to load stateless data model for type {DataType}", dataType);
            }
        }

        return result;
    }

    private async Task<Dictionary<string, List<AppOption>>> LoadStaticOptions(
        HashSet<string> optionIds,
        string language
    )
    {
        _ = language; // Reserved for future use (e.g., language-specific options)
        var result = new Dictionary<string, List<AppOption>>();
        var optionsFileHandler = _appImplementationFactory.GetRequired<IAppOptionsFileHandler>();

        var tasks = optionIds.Select(async optionsId =>
        {
            try
            {
                var options = await optionsFileHandler.ReadOptionsFromFileAsync(optionsId);
                return (optionsId, options);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to load options {OptionsId}", optionsId);
                return (optionsId, (List<AppOption>?)null);
            }
        });

        var results = await Task.WhenAll(tasks);
        foreach (var (optionsId, options) in results)
        {
            if (options is not null)
            {
                result[optionsId] = options;
            }
        }

        return result;
    }

    private object GetSchema(string dataType)
    {
        var schemaJson = _appResources.GetModelJsonSchema(dataType);
        return JsonSerializer.Deserialize<JsonElement>(schemaJson, _jsonSerializerOptions);
    }

    private async Task<object> GetFormDataAsync(
        Instance instance,
        DataElement dataElement,
        CancellationToken cancellationToken
    )
    {
        var formData = await _dataClient.GetFormData(instance, dataElement, cancellationToken: cancellationToken);
        return formData;
    }

    private object GetDefaultFormData(string classRef)
    {
        return _appModel.Create(classRef);
    }

    private object? GetValidationConfig(string dataType)
    {
        var configJson = _appResources.GetValidationConfiguration(dataType);
        if (string.IsNullOrEmpty(configJson))
        {
            return null;
        }

        return JsonSerializer.Deserialize<JsonElement>(configJson, _jsonSerializerOptions);
    }
}
