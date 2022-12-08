using Altinn.App.Core.Configuration;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Implementation;

/// <summary>
/// Default handling of task process events.
/// </summary>
public class DefaultTaskEvents : ITaskEvents
{
    private readonly ILogger<DefaultTaskEvents> _logger;
    private readonly IAppResources _appResources;
    private readonly Application _appMetadata;
    private readonly IData _dataClient;
    private readonly IPrefill _prefillService;
    private readonly IAppModel _appModel;
    private readonly IInstantiationProcessor _instantiationProcessor;
    private readonly IInstance _instanceClient;
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
        IAppResources resourceService,
        IData dataClient,
        IPrefill prefillService,
        IAppModel appModel,
        IInstantiationProcessor instantiationProcessor,
        IInstance instanceClient,
        IEnumerable<IProcessTaskStart> taskStarts,
        IEnumerable<IProcessTaskEnd> taskEnds,
        IEnumerable<IProcessTaskAbandon> taskAbandons,
        IPdfService pdfService,
        LayoutEvaluatorStateInitializer layoutEvaluatorStateInitializer,
        IOptions<AppSettings>? appSettings = null,
        IEFormidlingService? eFormidlingService = null)
    {
        _logger = logger;
        _appResources = resourceService;
        _appMetadata = resourceService.GetApplication();
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
        _logger.LogInformation($"OnStartProcessTask for {instance.Id}");

        foreach (var taskStart in _taskStarts)
        {
            await taskStart.Start(taskId, instance, prefill);
        }

        // If this is a revisit to a previous task we need to unlock data
        foreach (DataType dataType in _appMetadata.DataTypes.Where(dt => dt.TaskId == taskId))
        {
            DataElement? dataElement = instance.Data.Find(d => d.DataType == dataType.Id);

            if (dataElement != null && dataElement.Locked)
            {
                dataElement.Locked = false;
                _logger.LogInformation($"Unlocking data element {dataElement.Id} of dataType {dataType.Id}.");
                await _dataClient.Update(instance, dataElement);
            }
        }

        foreach (DataType dataType in _appMetadata.DataTypes.Where(dt =>
                     dt.TaskId == taskId && dt.AppLogic?.AutoCreate == true))
        {
            _logger.LogInformation($"Auto create data element: {dataType.Id}");

            DataElement? dataElement = instance.Data.Find(d => d.DataType == dataType.Id);

            if (dataElement == null)
            {
                dynamic data = _appModel.Create(dataType.AppLogic.ClassRef);

                // runs prefill from repo configuration if config exists
                await _prefillService.PrefillDataModel(instance.InstanceOwner.PartyId, dataType.Id, data, prefill);
                await _instantiationProcessor.DataCreation(instance, data, prefill);

                Type type = _appModel.GetModelType(dataType.AppLogic.ClassRef);

                DataElement createdDataElement =
                    await _dataClient.InsertFormData(instance, dataType.Id, data, type);
                instance.Data.Add(createdDataElement);

                await UpdatePresentationTextsOnInstance(instance, dataType.Id, data);
                await UpdateDataValuesOnInstance(instance, dataType.Id, data);

                _logger.LogInformation($"Created data element: {createdDataElement.Id}");
            }
        }
    }

    /// <inheritdoc />
    public async Task OnEndProcessTask(string endEvent, Instance instance)
    {
        Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
        List<DataType> dataTypesToLock = _appMetadata.DataTypes.FindAll(dt => dt.TaskId == endEvent);
        if (_appSettings?.RemoveHiddenDataPreview == true)
        {
            await RemoveHiddenData(instance, instanceGuid, dataTypesToLock);
        }

        foreach (var taskEnd in _taskEnds)
        {
            await taskEnd.End(endEvent, instance);
        }

        _logger.LogInformation($"OnEndProcessTask for {instance.Id}. Locking data elements connected to {endEvent} ===========");

        foreach (DataType dataType in dataTypesToLock)
        {
            bool generatePdf = dataType.AppLogic?.ClassRef != null && dataType.EnablePdfCreation;

            foreach (DataElement dataElement in instance.Data.FindAll(de => de.DataType == dataType.Id))
            {
                dataElement.Locked = true;
                _logger.LogInformation($"Locking data element {dataElement.Id} of dataType {dataType.Id}.");
                Task updateData = _dataClient.Update(instance, dataElement);

                if (generatePdf)
                {
                    Type dataElementType = _appModel.GetModelType(dataType.AppLogic.ClassRef);
                    Task createPdf =
                        _pdfService.GenerateAndStoreReceiptPDF(instance, endEvent, dataElement, dataElementType);
                    await Task.WhenAll(updateData, createPdf);
                }
                else
                {
                    await updateData;
                }
            }
        }
        if (_appSettings?.EnableEFormidling == true && _appMetadata.EFormidling?.SendAfterTaskId == endEvent && _eFormidlingService != null)
        {
            // The code above updates data elements on the instance. To ensure
            // we have the latest instance with all the data elements including pdf,
            // we reload the instance before we pass it on to eFormidling.
            var updatedInstance = await _instanceClient.GetInstance(instance);
            await _eFormidlingService.SendEFormidlingShipment(updatedInstance);
        }

        if (_appMetadata.AutoDeleteOnProcessEnd)
        {
            int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
            await _instanceClient.DeleteInstance(instanceOwnerPartyId, instanceGuid, true);
        }
    }

    private async Task RemoveHiddenData(Instance instance, Guid instanceGuid, List<DataType> dataTypesToLock)
    {
        foreach (var dataType in dataTypesToLock.Where(dt => dt.AppLogic != null))
        {
            foreach (Guid dataElementId in instance.Data.Where(de => de.DataType == dataType.Id).Select(dataElement => Guid.Parse(dataElement.Id)))
            {
                // Delete hidden data in datamodel
                Type modelType = _appModel.GetModelType(dataType.AppLogic.ClassRef);
                string app = instance.AppId.Split("/")[1];
                int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
                object data = await _dataClient.GetFormData(
                    instanceGuid, modelType, instance.Org, app, instanceOwnerPartyId, dataElementId);

                if (_appSettings?.RemoveHiddenDataPreview == true)
                {
                    // Remove hidden data before validation
                    var layoutSet = _appResources.GetLayoutSetForTask(dataType.TaskId);
                    var evaluationState = await _layoutEvaluatorStateInitializer.Init(instance, data, layoutSet?.Id);
                    LayoutEvaluator.RemoveHiddenData(evaluationState);
                }

                // save the updated data if there are changes
                await _dataClient.InsertFormData(data, instanceGuid, modelType, instance.Org, app, instanceOwnerPartyId, dataType.Id);
            }
        }
    }

    /// <inheritdoc />
    public async Task OnAbandonProcessTask(string taskId, Instance instance)
    {
        foreach (var taskAbandon in _taskAbandons)
        {
            await taskAbandon.Abandon(taskId, instance);
        }

        _logger.LogInformation(
            $"OnAbandonProcessTask for {instance.Id}. Locking data elements connected to {taskId}");
        await Task.CompletedTask;
    }

    private async Task UpdatePresentationTextsOnInstance(Instance instance, string dataType, dynamic data)
    {
        var updatedValues = DataHelper.GetUpdatedDataValues(
            _appMetadata.PresentationFields,
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
        var updatedValues = DataHelper.GetUpdatedDataValues(
            _appMetadata.DataFields,
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
