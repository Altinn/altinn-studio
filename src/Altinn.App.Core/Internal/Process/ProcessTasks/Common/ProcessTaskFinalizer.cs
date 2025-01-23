using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <inheritdoc/>
public class ProcessTaskFinalizer : IProcessTaskFinalizer
{
    private readonly IAppMetadata _appMetadata;
    private readonly IDataClient _dataClient;
    private readonly IInstanceClient _intanceClient;
    private readonly IAppModel _appModel;
    private readonly ILayoutEvaluatorStateInitializer _layoutEvaluatorStateInitializer;
    private readonly IOptions<AppSettings> _appSettings;
    private readonly ModelSerializationService _modelSerializer;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProcessTaskFinalizer"/> class.
    /// </summary>
    public ProcessTaskFinalizer(
        IAppMetadata appMetadata,
        IDataClient dataClient,
        IInstanceClient intanceClient,
        IAppModel appModel,
        ModelSerializationService modelSerializer,
        ILayoutEvaluatorStateInitializer layoutEvaluatorStateInitializer,
        IOptions<AppSettings> appSettings
    )
    {
        _appMetadata = appMetadata;
        _dataClient = dataClient;
        _layoutEvaluatorStateInitializer = layoutEvaluatorStateInitializer;
        _appSettings = appSettings;
        _intanceClient = intanceClient;
        _appModel = appModel;
        _modelSerializer = modelSerializer;
    }

    /// <inheritdoc/>
    public async Task Finalize(string taskId, Instance instance)
    {
        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();

        var dataAccessor = new InstanceDataUnitOfWork(
            instance,
            _dataClient,
            _intanceClient,
            applicationMetadata,
            _modelSerializer
        );

        List<Task> tasks = [];
        foreach (
            var dataType in applicationMetadata.DataTypes.Where(dt =>
                dt.TaskId == taskId && dt.AppLogic?.ClassRef is not null
            )
        )
        {
            foreach (var dataElement in instance.Data.Where(de => de.DataType == dataType.Id))
            {
                tasks.Add(RemoveFieldsOnTaskComplete(dataAccessor, taskId, applicationMetadata, dataElement, dataType));
            }
        }
        await Task.WhenAll(tasks);

        var changes = dataAccessor.GetDataElementChanges(initializeAltinnRowId: false);
        await dataAccessor.UpdateInstanceData(changes);
        await dataAccessor.SaveChanges(changes);
    }

    private async Task RemoveFieldsOnTaskComplete(
        InstanceDataUnitOfWork dataAccessor,
        string taskId,
        ApplicationMetadata applicationMetadata,
        DataElement dataElement,
        DataType dataType,
        string? language = null
    )
    {
        var data = await dataAccessor.GetFormData(dataElement);

        // remove AltinnRowIds
        ObjectUtils.RemoveAltinnRowId(data);

        // Remove hidden data before validation, ignore hidden rows.
        if (_appSettings.Value?.RemoveHiddenData == true)
        {
            // Backend removal of data is deprecated in favor of
            // implementing frontend removal of hidden data, so
            //this is not updated to remove from multiple data models at once.
            LayoutEvaluatorState evaluationState = await _layoutEvaluatorStateInitializer.Init(
                dataAccessor,
                taskId,
                gatewayAction: null,
                language
            );
            await LayoutEvaluator.RemoveHiddenDataAsync(evaluationState, RowRemovalOption.DeleteRow);
        }

        // Remove shadow fields
        // TODO: Use reflection or code generation instead of JsonSerializer
        if (dataType.AppLogic?.ShadowFields?.Prefix != null)
        {
            string serializedData = JsonSerializerIgnorePrefix.Serialize(data, dataType.AppLogic.ShadowFields.Prefix);
            if (dataType.AppLogic.ShadowFields.SaveToDataType != null)
            {
                // Save the shadow fields to another data type
                DataType? saveToDataType = applicationMetadata.DataTypes.Find(dt =>
                    dt.Id == dataType.AppLogic.ShadowFields.SaveToDataType
                );
                if (saveToDataType == null)
                {
                    throw new ProcessException(
                        $"SaveToDataType {dataType.AppLogic.ShadowFields.SaveToDataType} not found"
                    );
                }
                Type saveToModelType = _appModel.GetModelType(saveToDataType.AppLogic.ClassRef);

                object updatedData =
                    JsonSerializer.Deserialize(serializedData, saveToModelType)
                    ?? throw new JsonException(
                        "Could not deserialize back datamodel after removing shadow fields. Data was \"null\""
                    );
                // Save a new data element with the cleaned data without shadow fields.
                dataAccessor.AddFormDataElement(saveToDataType.Id, updatedData);
            }
            else
            {
                // Remove the shadow fields from the data using JsonSerializer
                var newData =
                    JsonSerializer.Deserialize(serializedData, data.GetType())
                    ?? throw new JsonException(
                        "Could not deserialize back datamodel after removing shadow fields. Data was \"null\""
                    );
                dataAccessor.SetFormData(dataElement, newData);
            }
        }
    }
}
