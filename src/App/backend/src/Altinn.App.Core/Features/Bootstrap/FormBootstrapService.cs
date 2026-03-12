using System.Text.Json;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Prefill;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Features.Bootstrap;

/// <summary>
/// Aggregates all form bootstrap data into a single response.
/// </summary>
public sealed class FormBootstrapService
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly IAppResources _appResources;
    private readonly IAppMetadata _appMetadata;
    private readonly IAppOptionsService _appOptionsService;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly IInitialValidationService _initialValidationService;
    private readonly IFormDataReader _formDataReader;
    private readonly IAppModel _appModel;
    private readonly IPrefill _prefillService;
    private readonly IAuthenticationContext _authenticationContext;
    private readonly ILogger<FormBootstrapService> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="FormBootstrapService"/> class.
    /// </summary>
    public FormBootstrapService(
        IAppResources appResources,
        IAppMetadata appMetadata,
        IAppOptionsService appOptionsService,
        IAppModel appModel,
        IPrefill prefillService,
        IAuthenticationContext authenticationContext,
        IServiceProvider serviceProvider,
        ILogger<FormBootstrapService> logger
    )
    {
        _appResources = appResources;
        _appMetadata = appMetadata;
        _appOptionsService = appOptionsService;
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
        _initialValidationService = serviceProvider.GetRequiredService<IInitialValidationService>();
        _formDataReader = serviceProvider.GetRequiredService<IFormDataReader>();
        _appModel = appModel;
        _prefillService = prefillService;
        _authenticationContext = authenticationContext;
        _logger = logger;
    }

    /// <summary>
    /// Gets all data needed to bootstrap a form for an instance.
    /// </summary>
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
        var referencedDataTypes = LayoutAnalysisService.GetReferencedDataTypes(layoutsJson, defaultDataType);
        var staticOptionsReferences = LayoutAnalysisService.GetStaticOptionsReferences(layoutsJson);

        var dataModelsTask = LoadInstanceDataModels(
            instance,
            referencedDataTypes,
            dataElementIdOverride,
            isPdf,
            language,
            cancellationToken
        );
        var optionsTask = LoadStaticOptions(
            staticOptionsReferences,
            language,
            new InstanceIdentifier(instance),
            cancellationToken
        );

        var taskId = instance.Process?.CurrentTask?.ElementId;
        var initialValidationTask =
            isPdf || taskId == null
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
            ValidationIssues = initialValidations?.TaskIssues,
        };
    }

    /// <summary>
    /// Gets all data needed to bootstrap a stateless form.
    /// </summary>
    public async Task<FormBootstrapResponse> GetStatelessFormBootstrap(
        string uiFolder,
        string language,
        Dictionary<string, string>? prefillFromQueryParams = null,
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

        var referencedDataTypes = LayoutAnalysisService.GetReferencedDataTypes(layoutsJson, defaultDataType);
        var staticOptionsReferences = LayoutAnalysisService.GetStaticOptionsReferences(layoutsJson);

        var dataModelsTask = LoadStatelessDataModels(
            referencedDataTypes,
            language,
            prefillFromQueryParams,
            cancellationToken
        );
        var optionsTask = LoadStaticOptions(
            staticOptionsReferences,
            language,
            instanceIdentifier: null,
            cancellationToken
        );

        await Task.WhenAll(dataModelsTask, optionsTask);

        return new FormBootstrapResponse
        {
            Layouts = layouts,
            DataModels = await dataModelsTask,
            StaticOptions = await optionsTask,
            ValidationIssues = null, // No validation for stateless
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
        string language,
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

                var schema = GetSchema(dataType);
                var formData = await GetFormDataAsync(instance, dataElement, language, cancellationToken);
                var validationConfig = isPdf || dataElement.Locked ? null : GetValidationConfig(dataType);

                return (
                    dataType,
                    (DataModelInfo?)
                        new DataModelInfo
                        {
                            Schema = schema,
                            InitialData = formData,
                            DataElementId = dataElement.Id,
                            ExpressionValidationConfig = validationConfig,
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
        string language,
        Dictionary<string, string>? prefillFromQueryParams = null,
        CancellationToken cancellationToken = default
    )
    {
        _ = cancellationToken;
        var result = new Dictionary<string, DataModelInfo>();
        var appMetadata = await _appMetadata.GetApplicationMetadata();
        var instanceOwner = await GetStatelessInstanceOwner();

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

                if (instanceOwner?.PartyId != null)
                {
                    await _prefillService.PrefillDataModel(
                        instanceOwner.PartyId,
                        dataType,
                        defaultData,
                        prefillFromQueryParams
                    );
                }

                await _formDataReader.ReadStatelessFormData(defaultData, language, instanceOwner);
                var validationConfig = GetValidationConfig(dataType);

                result[dataType] = new DataModelInfo
                {
                    Schema = schema,
                    InitialData = defaultData,
                    DataElementId = null,
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

    private async Task<InstanceOwner?> GetStatelessInstanceOwner()
    {
        Party? party;
        try
        {
            var currentAuth = _authenticationContext.Current;
            party = currentAuth switch
            {
                Authenticated.User auth => await auth.LookupSelectedParty(),
                Authenticated.Org auth => (await auth.LoadDetails()).Party,
                Authenticated.ServiceOwner auth => (await auth.LoadDetails()).Party,
                Authenticated.SystemUser auth => (await auth.LoadDetails()).Party,
                _ => null,
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to look up current party for stateless prefill, continuing without prefill");
            party = null;
        }

        return party is null ? null : InstantiationHelper.PartyToInstanceOwner(party);
    }

    private async Task<Dictionary<string, StaticOptionSet>> LoadStaticOptions(
        StaticOptionsAnalysisResult optionsAnalysis,
        string language,
        InstanceIdentifier? instanceIdentifier,
        CancellationToken cancellationToken
    )
    {
        _ = cancellationToken;
        var appOptionsFileHandler = _appImplementationFactory.GetRequired<IAppOptionsFileHandler>();
        var result = new Dictionary<string, StaticOptionSet>();
        var tasks = optionsAnalysis.AllReferencedOptionIds.Select(async optionsId =>
        {
            try
            {
                var isStaticallyConfigured = optionsAnalysis.StaticallyConfiguredOptionIds.Contains(optionsId);
                var optionsFromFile = await appOptionsFileHandler.ReadOptionsFromFileAsync(optionsId);
                var isPlainJsonFile = optionsFromFile is not null;

                if (!isStaticallyConfigured && !isPlainJsonFile)
                {
                    return (optionsId, null);
                }

                var options = optionsFromFile;
                string? downstreamParameters = null;
                if (options is null)
                {
                    var appOptions = await GetAppOptions(optionsId, language, [], instanceIdentifier);
                    options = appOptions?.Options;
                    var encodedParameters = appOptions?.Parameters.ToUrlEncodedNameValueString(',');
                    downstreamParameters = string.IsNullOrEmpty(encodedParameters) ? null : encodedParameters;
                }

                return (
                    optionsId,
                    options is null
                        ? null
                        : new StaticOptionSet { Options = options, DownstreamParameters = downstreamParameters }
                );
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to load options {OptionsId}", optionsId);
                return (optionsId, null);
            }
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
            DataModelIssues = dataModelIssues,
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
            CustomTextParameters = issue.CustomTextParameters,
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
        string language,
        CancellationToken cancellationToken
    )
    {
        var formData = await _formDataReader.ReadInstanceFormData(
            instance,
            dataElement,
            includeRowId: true,
            language: language,
            cancellationToken: cancellationToken
        );
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
