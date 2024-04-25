using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <inheritdoc/>
public class ProcessTaskFinalizer : IProcessTaskFinalizer
{
    private readonly IAppMetadata _appMetadata;
    private readonly IDataClient _dataClient;
    private readonly IAppModel _appModel;
    private readonly IAppResources _appResources;
    private readonly LayoutEvaluatorStateInitializer _layoutEvaluatorStateInitializer;
    private readonly IOptions<AppSettings> _appSettings;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProcessTaskFinalizer"/> class.
    /// </summary>
    /// <param name="appMetadata"></param>
    /// <param name="dataClient"></param>
    /// <param name="appModel"></param>
    /// <param name="appResources"></param>
    /// <param name="layoutEvaluatorStateInitializer"></param>
    /// <param name="appSettings"></param>
    public ProcessTaskFinalizer(
        IAppMetadata appMetadata,
        IDataClient dataClient,
        IAppModel appModel,
        IAppResources appResources,
        LayoutEvaluatorStateInitializer layoutEvaluatorStateInitializer,
        IOptions<AppSettings> appSettings
    )
    {
        _appMetadata = appMetadata;
        _dataClient = dataClient;
        _appModel = appModel;
        _appResources = appResources;
        _layoutEvaluatorStateInitializer = layoutEvaluatorStateInitializer;
        _appSettings = appSettings;
    }

    /// <inheritdoc/>
    public async Task Finalize(string taskId, Instance instance)
    {
        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();
        List<DataType> connectedDataTypes = applicationMetadata.DataTypes.FindAll(dt => dt.TaskId == taskId);

        await RemoveDataElementsGeneratedFromTask(instance, taskId);

        await RunRemoveFieldsInModelOnTaskComplete(instance, connectedDataTypes);
    }

    private async Task RemoveDataElementsGeneratedFromTask(Instance instance, string taskId)
    {
        AppIdentifier appIdentifier = new(instance.AppId);
        InstanceIdentifier instanceIdentifier = new(instance);
        foreach (
            DataElement dataElement in instance.Data?.Where(de =>
                de.References != null
                && de.References.Exists(r => r.ValueType == ReferenceType.Task && r.Value == taskId)
            ) ?? Enumerable.Empty<DataElement>()
        )
        {
            await _dataClient.DeleteData(
                appIdentifier.Org,
                appIdentifier.App,
                instanceIdentifier.InstanceOwnerPartyId,
                instanceIdentifier.InstanceGuid,
                Guid.Parse(dataElement.Id),
                false
            );
        }
    }

    private async Task RunRemoveFieldsInModelOnTaskComplete(Instance instance, List<DataType> dataTypesToLock)
    {
        ArgumentNullException.ThrowIfNull(instance.Data);

        dataTypesToLock = dataTypesToLock.Where(d => !string.IsNullOrEmpty(d.AppLogic?.ClassRef)).ToList();
        await Task.WhenAll(
            instance
                .Data.Join(dataTypesToLock, de => de.DataType, dt => dt.Id, (de, dt) => (dataElement: de, dataType: dt))
                .Select(
                    async (d) =>
                    {
                        await RemoveFieldsOnTaskComplete(instance, dataTypesToLock, d.dataElement, d.dataType);
                    }
                )
        );
    }

    private async Task RemoveFieldsOnTaskComplete(
        Instance instance,
        List<DataType> dataTypesToLock,
        DataElement dataElement,
        DataType dataType
    )
    {
        // Download the data
        Type modelType = _appModel.GetModelType(dataType.AppLogic.ClassRef);
        Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
        Guid dataGuid = Guid.Parse(dataElement.Id);
        string app = instance.AppId.Split("/")[1];
        int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
        object data = await _dataClient.GetFormData(
            instanceGuid,
            modelType,
            instance.Org,
            app,
            instanceOwnerPartyId,
            dataGuid
        );

        // Remove hidden data before validation, ignore hidden rows.
        if (_appSettings.Value?.RemoveHiddenData == true)
        {
            LayoutSet? layoutSet = _appResources.GetLayoutSetForTask(dataType.TaskId);
            LayoutEvaluatorState evaluationState = await _layoutEvaluatorStateInitializer.Init(
                instance,
                data,
                layoutSet?.Id
            );
            LayoutEvaluator.RemoveHiddenData(evaluationState, RowRemovalOption.Ignore);
        }

        // Remove shadow fields
        if (dataType.AppLogic?.ShadowFields?.Prefix != null)
        {
            string serializedData = JsonSerializerIgnorePrefix.Serialize(data, dataType.AppLogic.ShadowFields.Prefix);
            if (dataType.AppLogic.ShadowFields.SaveToDataType != null)
            {
                // Save the shadow fields to another data type
                DataType? saveToDataType = dataTypesToLock.Find(dt =>
                    dt.Id == dataType.AppLogic.ShadowFields.SaveToDataType
                );
                if (saveToDataType == null)
                {
                    throw new ProcessException(
                        $"SaveToDataType {dataType.AppLogic.ShadowFields.SaveToDataType} not found"
                    );
                }

                Type saveToModelType = _appModel.GetModelType(saveToDataType.AppLogic.ClassRef);
                object? updatedData = JsonSerializer.Deserialize(serializedData, saveToModelType);
                await _dataClient.InsertFormData(
                    updatedData,
                    instanceGuid,
                    saveToModelType ?? modelType,
                    instance.Org,
                    app,
                    instanceOwnerPartyId,
                    saveToDataType.Id
                );
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
}
