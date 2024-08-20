using System.Globalization;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
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

        var dataAccessor = new CachedInstanceDataAccessor(instance, _dataClient, _appMetadata, _appModel);
        var changedDataElements = await RunRemoveFieldsInModelOnTaskComplete(
            instance,
            dataAccessor,
            taskId,
            connectedDataTypes,
            language: null
        );

        // Save changes to the data elements with app logic that was changed.
        await Task.WhenAll(
            changedDataElements.Select(async dataElement =>
            {
                var data = await dataAccessor.GetData(dataElement);
                return _dataClient.UpdateData(
                    data,
                    Guid.Parse(instance.Id.Split('/')[1]),
                    data.GetType(),
                    instance.Org,
                    instance.AppId.Split('/')[1],
                    int.Parse(instance.InstanceOwner.PartyId, CultureInfo.InvariantCulture),
                    Guid.Parse(dataElement.Id)
                );
            })
        );
    }

    private async Task<IEnumerable<DataElement>> RunRemoveFieldsInModelOnTaskComplete(
        Instance instance,
        IInstanceDataAccessor dataAccessor,
        string taskId,
        List<DataType> dataTypesToLock,
        string? language = null
    )
    {
        ArgumentNullException.ThrowIfNull(instance.Data);
        HashSet<DataElement> modifiedDataElements = [];

        var dataTypesWithLogic = dataTypesToLock.Where(d => !string.IsNullOrEmpty(d.AppLogic?.ClassRef)).ToList();
        await Task.WhenAll(
            instance
                .Data.Join(
                    dataTypesWithLogic,
                    de => de.DataType,
                    dt => dt.Id,
                    (de, dt) => (dataElement: de, dataType: dt)
                )
                .Select(
                    async (d) =>
                    {
                        if (
                            await RemoveFieldsOnTaskComplete(
                                instance,
                                dataAccessor,
                                taskId,
                                dataTypesWithLogic,
                                d.dataElement,
                                d.dataType,
                                language
                            )
                        )
                        {
                            modifiedDataElements.Add(d.dataElement);
                        }
                    }
                )
        );
        return modifiedDataElements;
    }

    private async Task<bool> RemoveFieldsOnTaskComplete(
        Instance instance,
        IInstanceDataAccessor dataAccessor,
        string taskId,
        List<DataType> dataTypesWithLogic,
        DataElement dataElement,
        DataType dataType,
        string? language = null
    )
    {
        bool isModified = false;
        var data = await dataAccessor.GetData(dataElement);

        // remove AltinnRowIds
        isModified |= ObjectUtils.RemoveAltinnRowId(data);

        // Remove hidden data before validation, ignore hidden rows.
        if (_appSettings.Value?.RemoveHiddenData == true)
        {
            // Backend removal of data is deprecated in favor of
            // implementing frontend removal of hidden data, so
            //this is not updated to remove from multiple data models at once.
            LayoutEvaluatorState evaluationState = await _layoutEvaluatorStateInitializer.Init(
                instance,
                dataAccessor,
                taskId,
                gatewayAction: null,
                language
            );
            LayoutEvaluator.RemoveHiddenData(evaluationState, RowRemovalOption.Ignore);
            // TODO: Make RemoveHiddenData return a bool indicating if data was removed
            isModified = true;
        }

        // Remove shadow fields
        if (dataType.AppLogic?.ShadowFields?.Prefix != null)
        {
            string serializedData = JsonSerializerIgnorePrefix.Serialize(data, dataType.AppLogic.ShadowFields.Prefix);
            if (dataType.AppLogic.ShadowFields.SaveToDataType != null)
            {
                // Save the shadow fields to another data type
                DataType? saveToDataType = dataTypesWithLogic.Find(dt =>
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
                // Save a new data element with the cleaned data without shadow fields.
                Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
                string app = instance.AppId.Split("/")[1];
                int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId, CultureInfo.InvariantCulture);
                await _dataClient.InsertFormData(
                    updatedData,
                    instanceGuid,
                    saveToModelType,
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
                    JsonSerializer.Deserialize(serializedData, data.GetType())
                    ?? throw new JsonException(
                        "Could not deserialize back datamodel after removing shadow fields. Data was \"null\""
                    );
                (dataAccessor as CachedInstanceDataAccessor)?.Set(dataElement, data);
                isModified = true; // TODO: Detect if modifications were made
            }
        }

        // Save the updated data
        return isModified;
    }
}
