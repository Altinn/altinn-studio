using System.Globalization;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.DataModel;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <inheritdoc/>
public class ProcessTaskFinalizer : IProcessTaskFinalizer
{
    private readonly IAppMetadata _appMetadata;
    private readonly IDataClient _dataClient;
    private readonly IAppModel _appModel;
    private readonly ILayoutEvaluatorStateInitializer _layoutEvaluatorStateInitializer;
    private readonly IOptions<AppSettings> _appSettings;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProcessTaskFinalizer"/> class.
    /// </summary>
    public ProcessTaskFinalizer(
        IAppMetadata appMetadata,
        IDataClient dataClient,
        IAppModel appModel,
        ILayoutEvaluatorStateInitializer layoutEvaluatorStateInitializer,
        IOptions<AppSettings> appSettings
    )
    {
        _appMetadata = appMetadata;
        _dataClient = dataClient;
        _appModel = appModel;
        _layoutEvaluatorStateInitializer = layoutEvaluatorStateInitializer;
        _appSettings = appSettings;
    }

    /// <inheritdoc/>
    public async Task Finalize(string taskId, Instance instance)
    {
        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();
        List<DataType> connectedDataTypes = applicationMetadata.DataTypes.FindAll(dt => dt.TaskId == taskId);

        await RunRemoveFieldsInModelOnTaskComplete(instance, taskId, connectedDataTypes, language: null);
    }

    private async Task RunRemoveFieldsInModelOnTaskComplete(
        Instance instance,
        string taskId,
        List<DataType> dataTypesToLock,
        string? language = null
    )
    {
        ArgumentNullException.ThrowIfNull(instance.Data);

        dataTypesToLock = dataTypesToLock.Where(d => !string.IsNullOrEmpty(d.AppLogic?.ClassRef)).ToList();
        await Task.WhenAll(
            instance
                .Data.Join(dataTypesToLock, de => de.DataType, dt => dt.Id, (de, dt) => (dataElement: de, dataType: dt))
                .Select(
                    async (d) =>
                    {
                        await RemoveFieldsOnTaskComplete(
                            instance,
                            taskId,
                            dataTypesToLock,
                            d.dataElement,
                            d.dataType,
                            language
                        );
                    }
                )
        );
    }

    private async Task RemoveFieldsOnTaskComplete(
        Instance instance,
        string taskId,
        List<DataType> dataTypesToLock,
        DataElement dataElement,
        DataType dataType,
        string? language = null
    )
    {
        // Download the data
        Type modelType = _appModel.GetModelType(dataType.AppLogic.ClassRef);
        Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
        Guid dataGuid = Guid.Parse(dataElement.Id);
        string app = instance.AppId.Split("/")[1];
        int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId, CultureInfo.InvariantCulture);
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
            LayoutEvaluatorState evaluationState = await _layoutEvaluatorStateInitializer.Init(
                instance,
                taskId,
                gatewayAction: null,
                language
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
                data =
                    JsonSerializer.Deserialize(serializedData, modelType)
                    ?? throw new JsonException(
                        "Could not deserialize back datamodel after removing shadow fields. Data was \"null\""
                    );
            }
        }
        // remove AltinnRowIds
        ObjectUtils.RemoveAltinnRowId(data);

        // Save the updated data
        await _dataClient.UpdateData(data, instanceGuid, modelType, instance.Org, app, instanceOwnerPartyId, dataGuid);
    }
}
