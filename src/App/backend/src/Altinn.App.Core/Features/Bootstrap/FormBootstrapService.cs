using System.Text.Json;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
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
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly IAppResources _appResources;
    private readonly IAppMetadata _appMetadata;
    private readonly ILayoutAnalysisService _layoutAnalysis;
    private readonly IAppOptionsService _appOptionsService;
    private readonly IInitialValidationService _initialValidationService;
    private readonly IDataClient _dataClient;
    private readonly IAppModel _appModel;
    private readonly ILogger<FormBootstrapService> _logger;

    public FormBootstrapService(
        IAppResources appResources,
        IAppMetadata appMetadata,
        ILayoutAnalysisService layoutAnalysis,
        IAppOptionsService appOptionsService,
        IInitialValidationService initialValidationService,
        IDataClient dataClient,
        IAppModel appModel,
        ILogger<FormBootstrapService> logger
    )
    {
        _appResources = appResources;
        _appMetadata = appMetadata;
        _layoutAnalysis = layoutAnalysis;
        _appOptionsService = appOptionsService;
        _initialValidationService = initialValidationService;
        _dataClient = dataClient;
        _appModel = appModel;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<FormBootstrapResponse> GetInstanceFormBootstrap(
        Instance instance,
        string uiFolder,
        string? dataElementIdOverride,
        bool isPdf,
        string language,
        CancellationToken cancellationToken = default
    )
    {
        var defaultDataType = GetDefaultDataType(uiFolder);
        if (defaultDataType == null)
        {
            throw new InvalidOperationException("Unable to find default data type for folder");
        }

        var layoutsJson = _appResources.GetLayoutsInFolder(uiFolder);
        var layouts = DeserializeJson(layoutsJson);
        var referencedDataTypes = _layoutAnalysis.GetReferencedDataTypes(layoutsJson, defaultDataType);
        var staticOptions = _layoutAnalysis.GetStaticOptions(layoutsJson);

        var dataModelsTask = LoadInstanceDataModels(
            instance,
            referencedDataTypes,
            dataElementIdOverride,
            isPdf,
            cancellationToken
        );
        var optionsTask = LoadStaticOptions(
            staticOptions,
            language,
            new InstanceIdentifier(instance),
            cancellationToken
        );

        var taskId = instance.Process?.CurrentTask?.ElementId;
        var initialValidationTask = isPdf || taskId == null
            ? Task.FromResult<PartitionedInitialValidations?>(null)
            : LoadAndPartitionInitialValidations(instance, taskId, language, defaultDataType, cancellationToken);

        await Task.WhenAll(dataModelsTask, optionsTask, initialValidationTask);
        var dataModels = await dataModelsTask;
        var initialValidations = await initialValidationTask;
        AttachInitialValidationIssues(dataModels, initialValidations?.DataModelIssues);

        return new FormBootstrapResponse
        {
            Layouts = layouts,
            DataModels = dataModels,
            StaticOptions = await optionsTask,
            ValidationIssues = initialValidations?.TaskIssues
        };
    }

    /// <inheritdoc />
    public async Task<FormBootstrapResponse> GetStatelessFormBootstrap(
        string uiFolder,
        string language,
        CancellationToken cancellationToken = default
    )
    {
        var defaultDataType = GetDefaultDataType(uiFolder);
        if (defaultDataType == null)
        {
            throw new InvalidOperationException("Unable to find default data type for folder");
        }

        var layoutsJson = _appResources.GetLayoutsInFolder(uiFolder);
        var layouts = DeserializeJson(layoutsJson);

        var referencedDataTypes = _layoutAnalysis.GetReferencedDataTypes(layoutsJson, defaultDataType);
        var staticOptions = _layoutAnalysis.GetStaticOptions(layoutsJson);

        var dataModelsTask = LoadStatelessDataModels(referencedDataTypes, cancellationToken);
        var optionsTask = LoadStaticOptions(staticOptions, language, instanceIdentifier: null, cancellationToken);

        await Task.WhenAll(dataModelsTask, optionsTask);

        return new FormBootstrapResponse
        {
            Layouts = layouts,
            DataModels = await dataModelsTask,
            StaticOptions = await optionsTask,
            ValidationIssues = null // No validation for stateless
        };
    }

    private static object DeserializeJson(string json)
    {
        return JsonSerializer.Deserialize<JsonElement>(json, _jsonSerializerOptions);
    }

    private string? GetDefaultDataType(string uiFolder)
    {
        return _appResources.GetLayoutSettingsForFolder(uiFolder)?.DefaultDataType;
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
                    return (dataType, null);
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
                    return (dataType, null);
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
                            ExpressionValidationConfig = validationConfig
                        }
                );
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to load data model for type {DataType}", dataType);
                return (dataType, null);
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
                    ExpressionValidationConfig = validationConfig
                };
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to load stateless data model for type {DataType}", dataType);
            }
        }

        return result;
    }

    private async Task<Dictionary<string, StaticOptionsInfo>> LoadStaticOptions(
        Dictionary<string, List<Dictionary<string, string>>> staticOptions,
        string language,
        InstanceIdentifier? instanceIdentifier,
        CancellationToken cancellationToken
    )
    {
        _ = cancellationToken;
        var result = new Dictionary<string, StaticOptionsInfo>();
        var tasks = staticOptions.Select(async kvp =>
        {
            var optionsId = kvp.Key;
            var variants = new List<StaticOptionsVariant>();

            foreach (var queryParameters in kvp.Value)
            {
                try
                {
                    var appOptions = await GetAppOptions(optionsId, language, queryParameters, instanceIdentifier);
                    if (appOptions?.Options is null)
                    {
                        continue;
                    }

                    variants.Add(
                        new StaticOptionsVariant { QueryParameters = queryParameters, Options = appOptions.Options }
                    );
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to load options {OptionsId}", optionsId);
                }
            }

            return (optionsId, variants.Count > 0 ? new StaticOptionsInfo { Variants = variants } : null);
        });

        foreach (var (optionsId, info) in await Task.WhenAll(tasks))
        {
            if (info is not null)
            {
                result[optionsId] = info;
            }
        }

        return result;
    }

    private async Task<AppOptions?> GetAppOptions(
        string optionsId,
        string language,
        Dictionary<string, string> queryParameters,
        InstanceIdentifier? instanceIdentifier
    )
    {
        if (instanceIdentifier is not null)
        {
            var instanceOptions = await _appOptionsService.GetOptionsAsync(
                instanceIdentifier,
                optionsId,
                language,
                queryParameters
            );
            if (instanceOptions?.Options is not null)
            {
                return instanceOptions;
            }
        }

        return await _appOptionsService.GetOptionsAsync(optionsId, language, queryParameters);
    }

    private async Task<PartitionedInitialValidations?> LoadAndPartitionInitialValidations(
        Instance instance,
        string taskId,
        string language,
        string defaultDataType,
        CancellationToken cancellationToken
    )
    {
        var defaultDataElementId = instance
            .Data.FirstOrDefault(d => string.Equals(d.DataType, defaultDataType, StringComparison.OrdinalIgnoreCase))
            ?.Id;

        var issues = await _initialValidationService.Validate(instance, taskId, language, cancellationToken);
        return PartitionInitialValidationIssues(issues, defaultDataElementId);
    }

    private static PartitionedInitialValidations PartitionInitialValidationIssues(
        List<ValidationIssueWithSource> issues,
        string? defaultDataElementId
    )
    {
        var taskIssues = new List<ValidationIssueWithSource>();
        var dataModelIssues = new Dictionary<string, List<ValidationIssueWithSource>>();

        foreach (var issue in issues)
        {
            if (issue.Field is null && issue.DataElementId is null)
            {
                taskIssues.Add(issue);
                continue;
            }

            var dataElementId = issue.DataElementId ?? defaultDataElementId;
            if (dataElementId is null)
            {
                taskIssues.Add(issue);
                continue;
            }

            if (!dataModelIssues.TryGetValue(dataElementId, out var issuesForDataElement))
            {
                issuesForDataElement = [];
                dataModelIssues[dataElementId] = issuesForDataElement;
            }

            issuesForDataElement.Add(CloneValidationIssue(issue, dataElementId));
        }

        return new PartitionedInitialValidations
        {
            TaskIssues = taskIssues.Count == 0 ? null : taskIssues,
            DataModelIssues = dataModelIssues
        };
    }

    private static ValidationIssueWithSource CloneValidationIssue(ValidationIssueWithSource issue, string dataElementId)
    {
        return new ValidationIssueWithSource
        {
            Severity = issue.Severity,
            DataElementId = dataElementId,
            Field = issue.Field,
            Code = issue.Code,
            Description = issue.Description,
            Source = issue.Source,
            NoIncrementalUpdates = issue.NoIncrementalUpdates,
            CustomTextKey = issue.CustomTextKey,
#pragma warning disable CS0618
            CustomTextParams = issue.CustomTextParams,
#pragma warning restore CS0618
            CustomTextParameters = issue.CustomTextParameters
        };
    }

    private static void AttachInitialValidationIssues(
        Dictionary<string, DataModelInfo> dataModels,
        Dictionary<string, List<ValidationIssueWithSource>>? issuesByDataElement
    )
    {
        if (issuesByDataElement is null || issuesByDataElement.Count == 0)
        {
            return;
        }

        foreach (var model in dataModels.Values)
        {
            if (model.DataElementId is not null && issuesByDataElement.TryGetValue(model.DataElementId, out var issues))
            {
                model.InitialValidationIssues = issues;
            }
        }
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

    private sealed class PartitionedInitialValidations
    {
        public List<ValidationIssueWithSource>? TaskIssues { get; init; }

        public required Dictionary<string, List<ValidationIssueWithSource>> DataModelIssues { get; init; }
    }
}
