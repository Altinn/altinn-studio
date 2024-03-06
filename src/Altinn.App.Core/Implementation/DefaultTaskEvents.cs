using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Prefill;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.FeatureManagement;

namespace Altinn.App.Core.Implementation;

/// <summary>
/// Default handling of task process events.
/// </summary>
public class DefaultTaskEvents : ITaskEvents
{
    private readonly ILogger<DefaultTaskEvents> _logger;
    private readonly IAppResources _appResources;
    private readonly IAppMetadata _appMetadata;
    private readonly IDataClient _dataClient;
    private readonly IPrefill _prefillService;
    private readonly IAppModel _appModel;
    private readonly IInstantiationProcessor _instantiationProcessor;
    private readonly IInstanceClient _instanceClient;
    private readonly IEnumerable<IProcessTaskStart> _taskStarts;
    private readonly IEnumerable<IProcessTaskEnd> _taskEnds;
    private readonly IEnumerable<IProcessTaskAbandon> _taskAbandons;
    private readonly IPdfService _pdfService;
    private readonly IEFormidlingService? _eFormidlingService;
    private readonly AppSettings? _appSettings;
    private readonly LayoutEvaluatorStateInitializer _layoutEvaluatorStateInitializer;

    /// <summary>
    /// Constructor with services from DI
    /// </summary>
    public DefaultTaskEvents(
        ILogger<DefaultTaskEvents> logger,
        IAppResources appResources,
        IAppMetadata appMetadata,
        IDataClient dataClient,
        IPrefill prefillService,
        IAppModel appModel,
        IInstantiationProcessor instantiationProcessor,
        IInstanceClient instanceClient,
        IEnumerable<IProcessTaskStart> taskStarts,
        IEnumerable<IProcessTaskEnd> taskEnds,
        IEnumerable<IProcessTaskAbandon> taskAbandons,
        IPdfService pdfService,
        LayoutEvaluatorStateInitializer layoutEvaluatorStateInitializer,
        IOptions<AppSettings>? appSettings = null,
        IEFormidlingService? eFormidlingService = null
    )
    {
        _logger = logger;
        _appResources = appResources;
        _appMetadata = appMetadata;
        _dataClient = dataClient;
        _prefillService = prefillService;
        _appModel = appModel;
        _instantiationProcessor = instantiationProcessor;
        _instanceClient = instanceClient;
        _taskStarts = taskStarts;
        _taskEnds = taskEnds;
        _taskAbandons = taskAbandons;
        _pdfService = pdfService;
        _layoutEvaluatorStateInitializer = layoutEvaluatorStateInitializer;
        _eFormidlingService = eFormidlingService;
        _appSettings = appSettings?.Value;
    }

    /// <inheritdoc />
    public async Task OnStartProcessTask(string taskId, Instance instance, Dictionary<string, string> prefill)
    {
        _logger.LogDebug("OnStartProcessTask for {InstanceId}", instance.Id);

        await RunAppDefinedOnTaskStart(taskId, instance, prefill);
        ApplicationMetadata appMetadata = await _appMetadata.GetApplicationMetadata();

        // If this is a revisit to a previous task we need to unlock data
        foreach (DataType dataType in appMetadata.DataTypes.Where(dt => dt.TaskId == taskId))
        {
            DataElement? dataElement = instance.Data.Find(d => d.DataType == dataType.Id);

            if (dataElement != null && dataElement.Locked)
            {
                _logger.LogDebug("Unlocking data element {DataElementId} of dataType {DataTypeId}", dataElement.Id, dataType.Id);
                await _dataClient.UnlockDataElement(new InstanceIdentifier(instance), Guid.Parse(dataElement.Id));
            }
        }

        foreach (DataType dataType in appMetadata.DataTypes.Where(dt =>
                     dt.TaskId == taskId && dt.AppLogic?.AutoCreate == true))
        {
            _logger.LogDebug("Auto create data element: {DataTypeId}", dataType.Id);

            DataElement? dataElement = instance.Data.Find(d => d.DataType == dataType.Id);

            if (dataElement == null)
            {
                dynamic data = _appModel.Create(dataType.AppLogic.ClassRef);

                // runs prefill from repo configuration if config exists
                await _prefillService.PrefillDataModel(instance.InstanceOwner.PartyId, dataType.Id, data, prefill);
                await _instantiationProcessor.DataCreation(instance, data, prefill);

                Type type = _appModel.GetModelType(dataType.AppLogic.ClassRef);

                ObjectUtils.InitializeAltinnRowId(data);

                DataElement createdDataElement =
                    await _dataClient.InsertFormData(instance, dataType.Id, data, type);
                instance.Data.Add(createdDataElement);

                await UpdatePresentationTextsOnInstance(instance, dataType.Id, data);
                await UpdateDataValuesOnInstance(instance, dataType.Id, data);

                _logger.LogDebug("Created data element: {CreatedDataElementId}", createdDataElement.Id);
            }
        }
    }

    private async Task RunAppDefinedOnTaskStart(string taskId, Instance instance, Dictionary<string, string> prefill)
    {
        foreach (var taskStart in _taskStarts)
        {
            await taskStart.Start(taskId, instance, prefill);
        }
    }

    /// <inheritdoc />
    public async Task OnEndProcessTask(string endEvent, Instance instance)
    {
        Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
        ApplicationMetadata appMetadata = await _appMetadata.GetApplicationMetadata();
        List<DataType> dataTypesToLock = appMetadata.DataTypes.FindAll(dt => dt.TaskId == endEvent);

        await RunRemoveDataElementsGeneratedFromTask(instance, endEvent);

        await RunRemoveFieldsInModelOnTaskComplete(instance, dataTypesToLock);

        await RunAppDefinedOnTaskEnd(endEvent, instance);

        await RunLockDataAndGeneratePdf(endEvent, instance, dataTypesToLock);

        await RunEformidling(endEvent, instance);

        await RunAutoDeleteOnProcessEnd(instance, instanceGuid);
    }

    private async Task RunRemoveFieldsInModelOnTaskComplete(Instance instance, List<DataType> dataTypesToLock)
    {
        ArgumentNullException.ThrowIfNull(instance.Data);

        dataTypesToLock = dataTypesToLock.Where(d => !string.IsNullOrEmpty(d.AppLogic?.ClassRef)).ToList();
        await Task.WhenAll(
            instance.Data
                .Join(dataTypesToLock, de => de.DataType, dt => dt.Id, (de, dt) => (dataElement: de, dataType: dt))
                .Select(async (d) =>
                {
                    await RemoveFieldsOnTaskComplete(instance, dataTypesToLock, d.dataElement, d.dataType);
                }));
    }

    private async Task RemoveFieldsOnTaskComplete(Instance instance, List<DataType> dataTypesToLock, DataElement dataElement, DataType dataType)
    {
        // Download the data
        Type modelType = _appModel.GetModelType(dataType.AppLogic.ClassRef);
        var instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
        var dataGuid = Guid.Parse(dataElement.Id);
        string app = instance.AppId.Split("/")[1];
        int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
        object data = await _dataClient.GetFormData(
            instanceGuid, modelType, instance.Org, app, instanceOwnerPartyId, dataGuid);

        // Remove hidden data before validation, ignore hidden rows.
        if (_appSettings?.RemoveHiddenData == true)
        {
            var layoutSet = _appResources.GetLayoutSetForTask(dataType.TaskId);
            var evaluationState = await _layoutEvaluatorStateInitializer.Init(instance, data, layoutSet?.Id);
            LayoutEvaluator.RemoveHiddenData(evaluationState, RowRemovalOption.Ignore);
        }

        // Remove shadow fields
        if (dataType.AppLogic?.ShadowFields?.Prefix != null)
        {
            var modifier = new IgnorePropertiesWithPrefix(dataType.AppLogic.ShadowFields.Prefix);
            JsonSerializerOptions options = new()
            {
                TypeInfoResolver = new DefaultJsonTypeInfoResolver
                {
                    Modifiers = { modifier.ModifyPrefixInfo }
                },
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            };

            string serializedData = JsonSerializer.Serialize(data, options);
            if (dataType.AppLogic.ShadowFields.SaveToDataType != null)
            {
                // Save the shadow fields to another data type
                var saveToDataType = dataTypesToLock.Find(dt => dt.Id == dataType.AppLogic.ShadowFields.SaveToDataType);
                if (saveToDataType == null)
                {
                    throw new Exception($"SaveToDataType {dataType.AppLogic.ShadowFields.SaveToDataType} not found");
                }

                Type saveToModelType = _appModel.GetModelType(saveToDataType.AppLogic.ClassRef);
                var updatedData = JsonSerializer.Deserialize(serializedData, saveToModelType);
                await _dataClient.InsertFormData(updatedData, instanceGuid, saveToModelType ?? modelType, instance.Org, app, instanceOwnerPartyId, saveToDataType.Id);
            }
            else
            {
                // Remove the shadow fields from the data
                data = JsonSerializer.Deserialize(serializedData, modelType)!;
            }
        }
        // remove AltinnRowIds
        ObjectUtils.RemoveAltinnRowId(data);

        // Save the updated data
        await _dataClient.UpdateData(data, instanceGuid, modelType, instance.Org, app, instanceOwnerPartyId, dataGuid);
    }

    private async Task RunRemoveDataElementsGeneratedFromTask(Instance instance, string endEvent)
    {
        AppIdentifier appIdentifier = new AppIdentifier(instance.AppId);
        InstanceIdentifier instanceIdentifier = new InstanceIdentifier(instance);
        foreach (var dataElement in instance.Data?.Where(de => de.References != null && de.References.Exists(r => r.ValueType == ReferenceType.Task && r.Value == endEvent)) ?? Enumerable.Empty<DataElement>())
        {
            await _dataClient.DeleteData(appIdentifier.Org, appIdentifier.App, instanceIdentifier.InstanceOwnerPartyId, instanceIdentifier.InstanceGuid, Guid.Parse(dataElement.Id), false);
        }
    }

    private async Task RunAppDefinedOnTaskEnd(string endEvent, Instance instance)
    {
        foreach (var taskEnd in _taskEnds)
        {
            await taskEnd.End(endEvent, instance);
        }
    }

    private async Task RunLockDataAndGeneratePdf(string endEvent, Instance instance, List<DataType>? dataTypesToLock)
    {
        _logger.LogDebug("OnEndProcessTask for {instanceId}. Locking data elements connected to {endEvent}", instance.Id, endEvent);

        foreach (DataType dataType in dataTypesToLock ?? Enumerable.Empty<DataType>())
        {
            bool generatePdf = dataType.AppLogic?.ClassRef != null && dataType.EnablePdfCreation;

            foreach (DataElement dataElement in instance.Data.FindAll(de => de.DataType == dataType.Id))
            {
                _logger.LogDebug("Locking data element {dataElementId} of dataType {dataTypeId}.", dataElement.Id, dataType.Id);
                Task updateData = _dataClient.LockDataElement(new InstanceIdentifier(instance), Guid.Parse(dataElement.Id));

                if (generatePdf)
                {
                    Task createPdf = _pdfService.GenerateAndStorePdf(instance, endEvent, CancellationToken.None);

                    await Task.WhenAll(updateData, createPdf);
                }
                else
                {
                    await updateData;
                }
            }
        }
    }

    private async Task RunAutoDeleteOnProcessEnd(Instance instance, Guid instanceGuid)
    {
        ApplicationMetadata appMetadata = await _appMetadata.GetApplicationMetadata();
        if (appMetadata.AutoDeleteOnProcessEnd && instance.Process?.Ended != null)
        {
            int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
            await _instanceClient.DeleteInstance(instanceOwnerPartyId, instanceGuid, true);
        }
    }

    private async Task RunEformidling(string endEvent, Instance instance)
    {
        ApplicationMetadata appMetadata = await _appMetadata.GetApplicationMetadata();
        if (_appSettings?.EnableEFormidling == true && appMetadata.EFormidling?.SendAfterTaskId == endEvent && _eFormidlingService != null)
        {
            // The code above updates data elements on the instance. To ensure
            // we have the latest instance with all the data elements including pdf,
            // we reload the instance before we pass it on to eFormidling.
            var updatedInstance = await _instanceClient.GetInstance(instance);
            await _eFormidlingService.SendEFormidlingShipment(updatedInstance);
        }
    }


    /// <inheritdoc />
    public async Task OnAbandonProcessTask(string taskId, Instance instance)
    {
        foreach (var taskAbandon in _taskAbandons)
        {
            await taskAbandon.Abandon(taskId, instance);
        }

        _logger.LogDebug("OnAbandonProcessTask for {instanceId}. Locking data elements connected to {taskId}", instance.Id, taskId);
        await Task.CompletedTask;
    }

    private async Task UpdatePresentationTextsOnInstance(Instance instance, string dataType, dynamic data)
    {
        ApplicationMetadata appMetadata = await _appMetadata.GetApplicationMetadata();
        var updatedValues = DataHelper.GetUpdatedDataValues(
            appMetadata?.PresentationFields,
            instance.PresentationTexts,
            dataType,
            data);

        if (updatedValues.Count > 0)
        {
            var updatedInstance = await _instanceClient.UpdatePresentationTexts(
                int.Parse(instance.Id.Split("/")[0]),
                Guid.Parse(instance.Id.Split("/")[1]),
                new PresentationTexts { Texts = updatedValues });

            instance.PresentationTexts = updatedInstance.PresentationTexts;
        }
    }

    private async Task UpdateDataValuesOnInstance(Instance instance, string dataType, object data)
    {
        ApplicationMetadata appMetadata = await _appMetadata.GetApplicationMetadata();
        var updatedValues = DataHelper.GetUpdatedDataValues(
            appMetadata?.DataFields,
            instance.DataValues,
            dataType,
            data);

        if (updatedValues.Count > 0)
        {
            var updatedInstance = await _instanceClient.UpdateDataValues(
                int.Parse(instance.Id.Split("/")[0]),
                Guid.Parse(instance.Id.Split("/")[1]),
                new DataValues { Values = updatedValues });

            instance.DataValues = updatedInstance.DataValues;
        }
    }
}
