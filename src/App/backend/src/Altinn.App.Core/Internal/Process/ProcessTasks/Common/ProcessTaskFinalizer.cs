using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <inheritdoc/>
public class ProcessTaskFinalizer : IProcessTaskFinalizer
{
    private readonly IAppMetadata _appMetadata;
    private readonly IAppModel _appModel;
    private readonly ILayoutEvaluatorStateInitializer _layoutEvaluatorStateInitializer;
    private readonly InstanceDataUnitOfWorkInitializer _instanceDataUnitOfWorkInitializer;
    private readonly IOptions<AppSettings> _appSettings;
    private readonly IDataElementAccessChecker _dataElementAccessChecker;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProcessTaskFinalizer"/> class.
    /// </summary>
    public ProcessTaskFinalizer(
        IAppMetadata appMetadata,
        IAppModel appModel,
        ILayoutEvaluatorStateInitializer layoutEvaluatorStateInitializer,
        IServiceProvider serviceProvider,
        IOptions<AppSettings> appSettings
    )
    {
        _appMetadata = appMetadata;
        _layoutEvaluatorStateInitializer = layoutEvaluatorStateInitializer;
        _instanceDataUnitOfWorkInitializer = serviceProvider.GetRequiredService<InstanceDataUnitOfWorkInitializer>();
        _dataElementAccessChecker = serviceProvider.GetRequiredService<IDataElementAccessChecker>();
        _appSettings = appSettings;
        _appModel = appModel;
    }

    /// <inheritdoc/>
    public async Task Finalize(string taskId, Instance instance)
    {
        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();

        var dataAccessor = await _instanceDataUnitOfWorkInitializer.Init(instance, taskId, "nb");

        List<Task> tasks = [];
        foreach (
            var dataType in applicationMetadata.DataTypes.Where(dt =>
                dt.TaskId == taskId && dt.AppLogic?.ClassRef is not null
            )
        )
        {
            if (await _dataElementAccessChecker.CanRead(dataAccessor.Instance, dataType) is false)
            {
                continue;
            }

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
        var formDataWrapper = await dataAccessor.GetFormDataWrapper(dataElement);

        // remove AltinnRowIds
        formDataWrapper.RemoveAltinnRowIds();

        var data = formDataWrapper.BackingData<object>();

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
            await LayoutEvaluator.RemoveHiddenDataAsync(
                evaluationState,
                RowRemovalOption.DeleteRow,
                evaluateRemoveWhenHidden: true
            );
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
                dataAccessor.SetFormData(dataElement, FormDataWrapperFactory.Create(newData));
            }
        }
    }
}
