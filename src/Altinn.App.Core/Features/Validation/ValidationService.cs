using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Features.Validation;

/// <summary>
/// Main validation service that encapsulates all validation logic
/// </summary>
public class ValidationService : IValidationService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IDataClient _dataClient;
    private readonly IAppModel _appModel;
    private readonly IAppMetadata _appMetadata;
    private readonly ILogger<ValidationService> _logger;

    /// <summary>
    /// Constructor with DI services
    /// </summary>
    public ValidationService(IServiceProvider serviceProvider, IDataClient dataClient, IAppModel appModel, IAppMetadata appMetadata, ILogger<ValidationService> logger)
    {
        _serviceProvider = serviceProvider;
        _dataClient = dataClient;
        _appModel = appModel;
        _appMetadata = appMetadata;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<List<ValidationIssue>> ValidateInstanceAtTask(Instance instance, string taskId)
    {
        ArgumentNullException.ThrowIfNull(instance);
        ArgumentNullException.ThrowIfNull(taskId);

        // Run task validations
        var taskValidators = _serviceProvider.GetServices<ITaskValidator>()
            .Where(tv => tv.TaskId == "*" || tv.TaskId == taskId)
            // .Concat(_serviceProvider.GetKeyedServices<ITaskValidator>(taskId))
            .ToArray();

        var taskIssuesTask = Task.WhenAll(taskValidators.Select(async tv =>
        {
            try
            {
                _logger.LogDebug("Start running validator {validatorName} on task {taskId} in instance {instanceId}", tv.GetType().Name, taskId, instance.Id);
                var issues = await tv.ValidateTask(instance, taskId);
                issues.ForEach(i => i.Source = tv.ValidationSource); // Ensure that the source is set to the validator source
                return issues;
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Error while running validator {validatorName} on task {taskId} in instance {instanceId}", tv.GetType().Name, taskId, instance.Id);
                throw;
            }
        }));

        // Run validations for single data elements
        var application = await _appMetadata.GetApplicationMetadata();
        var dataTypesForTask = application.DataTypes.Where(dt => dt.TaskId == taskId).ToList();
        var dataElementsToValidate = instance.Data.Where(de => dataTypesForTask.Exists(dt => dt.Id == de.DataType)).ToArray();
        var dataIssuesTask = Task.WhenAll(dataElementsToValidate.Select(dataElement=>ValidateDataElement(instance, dataElement, dataTypesForTask.First(dt=>dt.Id == dataElement.DataType) )));

        return (await Task.WhenAll(taskIssuesTask, dataIssuesTask)).SelectMany(x=>x.SelectMany(y=>y)).ToList();
    }


    /// <inheritdoc/>
    public async Task<List<ValidationIssue>> ValidateDataElement(Instance instance, DataElement dataElement, DataType dataType)
    {
        ArgumentNullException.ThrowIfNull(instance);
        ArgumentNullException.ThrowIfNull(dataElement);
        ArgumentNullException.ThrowIfNull(dataElement.DataType);

        // Get both keyed and non-keyed validators for the data type
        var validators = _serviceProvider.GetServices<IDataElementValidator>()
            .Where(v => v.DataType == "*" || v.DataType == dataType.Id)
            // .Concat(_serviceProvider.GetKeyedServices<IDataElementValidator>(dataElement.DataType))
            .ToArray();

        var dataElementsIssuesTask = Task.WhenAll(validators.Select(async v =>
        {
            try
            {
                _logger.LogDebug("Start running validator {validatorName} on {dataType} for data element {dataElementId} in instance {instanceId}", v.GetType().Name, dataElement.DataType, dataElement.Id, instance.Id);
                var issues = await v.ValidateDataElement(instance, dataElement, dataType);
                issues.ForEach(i => i.Source = v.ValidationSource); // Ensure that the source is set to the validator source
                return issues;
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Error while running validator {validatorName} on {dataType} for data element {dataElementId} in instance {instanceId}", v.GetType().Name, dataElement.DataType, dataElement.Id, instance.Id);
                throw;
            }
        }));

        // Run extra validation on form data elements with app logic
        if(dataType.AppLogic?.ClassRef is not null)
        {
            Type modelType = _appModel.GetModelType(dataType.AppLogic.ClassRef);

            Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
            string app = instance.AppId.Split("/")[1];
            int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
            var data = await _dataClient.GetFormData(instanceGuid, modelType, instance.Org, app, instanceOwnerPartyId, Guid.Parse(dataElement.Id)); // TODO: Add method that accepts instance and dataElement
            var formDataIssuesDictionary = await ValidateFormData(instance, dataElement, dataType, data);

            return (await dataElementsIssuesTask).SelectMany(x=>x)
                .Concat(formDataIssuesDictionary.SelectMany(kv=>kv.Value))
                .ToList();
        }

        return (await dataElementsIssuesTask).SelectMany(x=>x).ToList();
    }

    /// <inheritdoc/>
    public async Task<Dictionary<string, List<ValidationIssue>>> ValidateFormData(Instance instance, DataElement dataElement, DataType dataType, object data,
        object? previousData = null, List<string>? ignoredValidators = null)
    {
        ArgumentNullException.ThrowIfNull(instance);
        ArgumentNullException.ThrowIfNull(dataElement);
        ArgumentNullException.ThrowIfNull(dataElement.DataType);
        ArgumentNullException.ThrowIfNull(data);

        // Locate the relevant data validator services from normal and keyed services
        var dataValidators = _serviceProvider.GetServices<IFormDataValidator>()
            .Where(dv => dv.DataType == "*" || dv.DataType == dataType.Id)
            // .Concat(_serviceProvider.GetKeyedServices<IFormDataValidator>(dataElement.DataType))
            .Where(dv => ignoredValidators?.Contains(dv.ValidationSource) != true)
            .Where(dv => previousData is null || dv.HasRelevantChanges(data, previousData))
            .ToArray();

        var issuesLists = await Task.WhenAll(dataValidators.Select(async (v) =>
        {
            try
            {
                _logger.LogDebug("Start running validator {validatorName} on {dataType} for data element {dataElementId} in instance {instanceId}", v.GetType().Name, dataElement.DataType, dataElement.Id, instance.Id);
                var issues = await v.ValidateFormData(instance, dataElement, data);
                issues.ForEach(i => i.Source = v.ValidationSource);// Ensure that the code is set to the validator code
                return issues;
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Error while running validator {validatorName} on {dataType} for data element {dataElementId} in instance {instanceId}", v.GetType().Name, dataElement.DataType, dataElement.Id, instance.Id);
                throw;
            }
        }));

        return dataValidators.Zip(issuesLists).ToDictionary(kv => kv.First.ValidationSource, kv => kv.Second);
    }

}