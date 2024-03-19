using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Prefill;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <inheritdoc/>
public class ProcessTaskInitializer : IProcessTaskInitializer
{
    private readonly ILogger<ProcessTaskInitializer> _logger;
    private readonly IAppMetadata _appMetadata;
    private readonly IDataClient _dataClient;
    private readonly IPrefill _prefillService;
    private readonly IAppModel _appModel;
    private readonly IInstantiationProcessor _instantiationProcessor;
    private readonly IInstanceClient _instanceClient;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProcessTaskInitializer"/> class.
    /// </summary>
    /// <param name="logger"></param>
    /// <param name="appMetadata"></param>
    /// <param name="dataClient"></param>
    /// <param name="prefillService"></param>
    /// <param name="appModel"></param>
    /// <param name="instantiationProcessor"></param>
    /// <param name="instanceClient"></param>
    public ProcessTaskInitializer(ILogger<ProcessTaskInitializer> logger,
        IAppMetadata appMetadata,
        IDataClient dataClient,
        IPrefill prefillService,
        IAppModel appModel,
        IInstantiationProcessor instantiationProcessor,
        IInstanceClient instanceClient)
    {
        _logger = logger;
        _appMetadata = appMetadata;
        _dataClient = dataClient;
        _prefillService = prefillService;
        _appModel = appModel;
        _instantiationProcessor = instantiationProcessor;
        _instanceClient = instanceClient;
    }

    /// <inheritdoc/>
    public async Task Initialize(string taskId, Instance instance, Dictionary<string, string>? prefill)
    {
        _logger.LogDebug("OnStartProcessTask for {InstanceId}", instance.Id);

        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();

        foreach (DataType dataType in applicationMetadata.DataTypes.Where(dt =>
                     dt.TaskId == taskId && dt.AppLogic?.AutoCreate == true))
        {
            _logger.LogDebug("Auto create data element: {DataTypeId}", dataType.Id);

            DataElement? dataElement = instance.Data?.Find(d => d.DataType == dataType.Id);
            if (dataElement != null)
            {
                continue;
            }

            dynamic data = _appModel.Create(dataType.AppLogic.ClassRef);

            // runs prefill from repo configuration if config exists
            await _prefillService.PrefillDataModel(instance.InstanceOwner.PartyId, dataType.Id, data, prefill);
            await _instantiationProcessor.DataCreation(instance, data, prefill);

            Type type = _appModel.GetModelType(dataType.AppLogic.ClassRef);

            ObjectUtils.InitializeAltinnRowId(data);

            DataElement createdDataElement = await _dataClient.InsertFormData(instance, dataType.Id, data, type);
            instance.Data ??= [];
            instance.Data.Add(createdDataElement);

            await UpdatePresentationTextsOnInstance(instance, dataType.Id, data);
            await UpdateDataValuesOnInstance(instance, dataType.Id, data);

            _logger.LogDebug("Created data element: {CreatedDataElementId}", createdDataElement.Id);
        }
    }

    private async Task UpdatePresentationTextsOnInstance(Instance instance, string dataType, dynamic data)
    {
        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();
        dynamic? updatedValues = DataHelper.GetUpdatedDataValues(
            applicationMetadata?.PresentationFields,
            instance.PresentationTexts,
            dataType,
            data);

        if (updatedValues.Count > 0)
        {
            Instance updatedInstance = await _instanceClient.UpdatePresentationTexts(
                int.Parse(instance.Id.Split("/")[0]),
                Guid.Parse(instance.Id.Split("/")[1]),
                new PresentationTexts { Texts = updatedValues });

            instance.PresentationTexts = updatedInstance.PresentationTexts;
        }
    }

    private async Task UpdateDataValuesOnInstance(Instance instance, string dataType, object data)
    {
        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();
        Dictionary<string, string?> updatedValues = DataHelper.GetUpdatedDataValues(
            applicationMetadata?.DataFields,
            instance.DataValues,
            dataType,
            data);

        if (updatedValues.Count > 0)
        {
            Instance updatedInstance = await _instanceClient.UpdateDataValues(
                int.Parse(instance.Id.Split("/")[0]),
                Guid.Parse(instance.Id.Split("/")[1]),
                new DataValues { Values = updatedValues });

            instance.DataValues = updatedInstance.DataValues;
        }
    }
}