using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.Validation;

/// <summary>
/// Main validation service that encapsulates all validation logic
/// </summary>
public class ValidationService : IValidationService
{
    private readonly IValidatorFactory _validatorFactory;
    private readonly IAppMetadata _appMetadata;
    private readonly ILogger<ValidationService> _logger;
    private readonly Telemetry? _telemetry;
    private readonly ICachedFormDataAccessor _formDataCache;

    /// <summary>
    /// Constructor with DI services
    /// </summary>
    public ValidationService(
        IValidatorFactory validatorFactory,
        IDataClient dataClient,
        IAppModel appModel,
        IAppMetadata appMetadata,
        ILogger<ValidationService> logger,
        ICachedFormDataAccessor formDataCache,
        Telemetry? telemetry = null
    )
    {
        _validatorFactory = validatorFactory;
        _appMetadata = appMetadata;
        _logger = logger;
        _formDataCache = formDataCache;
        _telemetry = telemetry;
    }

    /// <inheritdoc/>
    public async Task<List<ValidationIssue>> ValidateInstanceAtTask(Instance instance, string taskId, string? language)
    {
        ArgumentNullException.ThrowIfNull(instance);
        ArgumentNullException.ThrowIfNull(taskId);

        using var activity = _telemetry?.StartValidateInstanceAtTaskActivity(instance, taskId);

        // Run task validations (but don't await yet)
        Task<List<ValidationIssue>[]> taskIssuesTask = RunTaskValidators(instance, taskId, language);

        // Get list of data elements for the task
        var application = await _appMetadata.GetApplicationMetadata();
        var dataTypesForTask = application.DataTypes.Where(dt => dt.TaskId == taskId).ToList();
        var dataElementsToValidate = instance
            .Data.Where(de => dataTypesForTask.Exists(dt => dt.Id == de.DataType))
            .ToArray();
        // Run ValidateDataElement for each data element (but don't await yet)
        var dataIssuesTask = Task.WhenAll(
            dataElementsToValidate.Select(dataElement =>
                ValidateDataElement(
                    instance,
                    dataElement,
                    dataTypesForTask.First(dt => dt.Id == dataElement.DataType),
                    language
                )
            )
        );

        var lists = await Task.WhenAll(taskIssuesTask, dataIssuesTask);
        // Flatten the list of lists to a single list of issues
        return lists.SelectMany(x => x.SelectMany(y => y)).ToList();
    }

    private Task<List<ValidationIssue>[]> RunTaskValidators(Instance instance, string taskId, string? language)
    {
        var taskValidators = _validatorFactory.GetTaskValidators(taskId);

        return Task.WhenAll(
            taskValidators.Select(async v =>
            {
                using var activity = _telemetry?.StartRunTaskValidatorActivity(v);
                try
                {
                    _logger.LogDebug(
                        "Start running validator {ValidatorName} on task {TaskId} in instance {InstanceId}",
                        v.ValidationSource,
                        taskId,
                        instance.Id
                    );
                    var issues = await v.ValidateTask(instance, taskId, language);
                    issues.ForEach(i => i.Source = v.ValidationSource); // Ensure that the source is set to the validator source
                    return issues;
                }
                catch (Exception e)
                {
                    _logger.LogError(
                        e,
                        "Error while running validator {ValidatorName} on task {TaskId} in instance {InstanceId}",
                        v.ValidationSource,
                        taskId,
                        instance.Id
                    );
                    activity?.Errored(e);
                    throw;
                }
            })
        );
    }

    /// <inheritdoc/>
    public async Task<List<ValidationIssue>> ValidateDataElement(
        Instance instance,
        DataElement dataElement,
        DataType dataType,
        string? language
    )
    {
        ArgumentNullException.ThrowIfNull(instance);
        ArgumentNullException.ThrowIfNull(dataElement);
        ArgumentNullException.ThrowIfNull(dataElement.DataType);

        using var activity = _telemetry?.StartValidateDataElementActivity(instance, dataElement);

        // Get both keyed and non-keyed validators for the data type
        Task<List<ValidationIssue>[]> dataElementsIssuesTask = RunDataElementValidators(
            instance,
            dataElement,
            dataType,
            language
        );

        // Run extra validation on form data elements with app logic
        if (dataType.AppLogic?.ClassRef is not null)
        {
            var data = await _formDataCache.Get(instance, dataElement);
            var formDataIssuesDictionary = await ValidateFormData(
                instance,
                dataElement,
                dataType,
                data,
                previousData: null,
                ignoredValidators: null,
                language
            );

            return (await dataElementsIssuesTask)
                .SelectMany(x => x)
                .Concat(formDataIssuesDictionary.SelectMany(kv => kv.Value))
                .ToList();
        }

        return (await dataElementsIssuesTask).SelectMany(x => x).ToList();
    }

    private Task<List<ValidationIssue>[]> RunDataElementValidators(
        Instance instance,
        DataElement dataElement,
        DataType dataType,
        string? language
    )
    {
        var validators = _validatorFactory.GetDataElementValidators(dataType.Id);

        var dataElementsIssuesTask = Task.WhenAll(
            validators.Select(async v =>
            {
                using var activity = _telemetry?.StartRunDataElementValidatorActivity(v);
                try
                {
                    _logger.LogDebug(
                        "Start running validator {validatorName} on {dataType} for data element {dataElementId} in instance {instanceId}",
                        v.ValidationSource,
                        dataElement.DataType,
                        dataElement.Id,
                        instance.Id
                    );
                    var issues = await v.ValidateDataElement(instance, dataElement, dataType, language);
                    issues.ForEach(i => i.Source = v.ValidationSource); // Ensure that the source is set to the validator source
                    return issues;
                }
                catch (Exception e)
                {
                    _logger.LogError(
                        e,
                        "Error while running validator {validatorName} on {dataType} for data element {dataElementId} in instance {instanceId}",
                        v.ValidationSource,
                        dataElement.DataType,
                        dataElement.Id,
                        instance.Id
                    );
                    activity?.Errored(e);
                    throw;
                }
            })
        );

        return dataElementsIssuesTask;
    }

    /// <inheritdoc/>
    public async Task<Dictionary<string, List<ValidationIssue>>> ValidateFormData(
        Instance instance,
        DataElement dataElement,
        DataType dataType,
        object data,
        object? previousData,
        List<string>? ignoredValidators,
        string? language
    )
    {
        ArgumentNullException.ThrowIfNull(instance);
        ArgumentNullException.ThrowIfNull(dataElement);
        ArgumentNullException.ThrowIfNull(dataElement.DataType);
        ArgumentNullException.ThrowIfNull(data);

        using var activity = _telemetry?.StartValidateFormDataActivity(instance, dataElement);

        // Set data from request instead of fetching the old data.
        _formDataCache.Set(dataElement, data);

        // Locate the relevant data validator services from normal and keyed services
        var dataValidators = _validatorFactory
            .GetFormDataValidators(dataType.Id)
            .Where(dv => ignoredValidators?.Contains(dv.ValidationSource) != true) // Filter out ignored validators
            .Where(dv => previousData is null || dv.HasRelevantChanges(data, previousData))
            .ToArray();

        var validationTasks = dataValidators.Select(async v =>
        {
            using var activity = _telemetry?.StartRunFormDataValidatorActivity(v);
            try
            {
                _logger.LogDebug(
                    "Start running validator {ValidatorName} on {DataType} for data element {DataElementId} in instance {InstanceId}",
                    v.ValidationSource,
                    dataElement.DataType,
                    dataElement.Id,
                    instance.Id
                );
                var issues = await v.ValidateFormData(instance, dataElement, data, language);
                issues.ForEach(i => i.Source = v.ValidationSource); // Ensure that the Source is set to the ValidatorSource
                return issues;
            }
            catch (Exception e)
            {
                _logger.LogError(
                    e,
                    "Error while running validator {ValidatorName} on {DataType} for data element {DataElementId} in instance {InstanceId}",
                    v.ValidationSource,
                    dataElement.DataType,
                    dataElement.Id,
                    instance.Id
                );
                activity?.Errored(e);
                throw;
            }
        });

        var validationSources = dataValidators.Select(d => d.ValidationSource).ToList();

        var issuesLists = await Task.WhenAll(validationTasks);

        return validationSources.Zip(issuesLists).ToDictionary(kv => kv.First, kv => kv.Second);
    }
}
