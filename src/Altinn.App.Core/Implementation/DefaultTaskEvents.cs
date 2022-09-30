using Altinn.App.Core.Configuration;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Pdf;
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
    private readonly Application _appMetadata;
    private readonly IData _dataClient;
    private readonly IPrefill _prefillService;
    private readonly IAppModel _appModel;
    private readonly IInstantiationProcessor _instantiationProcessor;
    private readonly IInstance _instanceClient;
    private readonly IEnumerable<IProcessTaskEnd> _taskEnds;
    private readonly IEnumerable<IProcessTaskAbandon> _taskAbandons;
    private readonly IPdfService _pdfService;
    private readonly IEFormidlingService? _eFormidlingService;
    private readonly AppSettings? _appSettings;

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
        IEnumerable<IProcessTaskEnd> taskEnds,
        IEnumerable<IProcessTaskAbandon> taskAbandons,
        IPdfService pdfService,
        IOptions<AppSettings>? appSettings = null,
        IEFormidlingService? eFormidlingService = null)
    {
        _logger = logger;
        _appMetadata = resourceService.GetApplication();
        _dataClient = dataClient;
        _prefillService = prefillService;
        _appModel = appModel;
        _instantiationProcessor = instantiationProcessor;
        _instanceClient = instanceClient;
        _taskEnds = taskEnds;
        _taskAbandons = taskAbandons;
        _pdfService = pdfService;
        _eFormidlingService = eFormidlingService;
        _appSettings = appSettings?.Value;
    }

    /// <inheritdoc />
    public async Task OnStartProcessTask(string taskId, Instance instance, Dictionary<string, string> prefill)
    {
        _logger.LogInformation($"OnStartProcessTask for {instance.Id}");

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
        foreach (var taskEnd in _taskEnds)
        {
            await taskEnd.End(endEvent, instance);
        }

        _logger.LogInformation($"OnEndProcessTask for {instance.Id}. Locking data elements connected to {endEvent} ===========");

        List<DataType> dataTypesToLock = _appMetadata.DataTypes.FindAll(dt => dt.TaskId == endEvent);

        Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
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
            await _eFormidlingService.SendEFormidlingShipment(instance);
        }

        if (_appMetadata.AutoDeleteOnProcessEnd)
        {
            int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
            await _instanceClient.DeleteInstance(instanceOwnerPartyId, instanceGuid, true);
        }
        await Task.CompletedTask;
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
