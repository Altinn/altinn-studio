using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;

internal sealed class CommonTaskFinalization : IWorkflowEngineCommand
{
    public static string Key => "CommonTaskFinalization";

    public string GetKey() => Key;

    private readonly IAppMetadata _appMetadata;
    private readonly IAppModel _appModel;
    private readonly ILayoutEvaluatorStateInitializer _layoutEvaluatorStateInitializer;
    private readonly IOptions<AppSettings> _appSettings;
    private readonly IDataElementAccessChecker _dataElementAccessChecker;

    public CommonTaskFinalization(
        IAppMetadata appMetadata,
        IAppModel appModel,
        ILayoutEvaluatorStateInitializer layoutEvaluatorStateInitializer,
        IOptions<AppSettings> appSettings,
        IDataElementAccessChecker dataElementAccessChecker
    )
    {
        _appMetadata = appMetadata;
        _appModel = appModel;
        _layoutEvaluatorStateInitializer = layoutEvaluatorStateInitializer;
        _appSettings = appSettings;
        _dataElementAccessChecker = dataElementAccessChecker;
    }

    public async Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext parameters)
    {
        IInstanceDataMutator dataMutator = parameters.InstanceDataMutator;
        Instance instance = dataMutator.Instance;
        string taskId = instance.Process.CurrentTask.ElementId;

        try
        {
            ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();

            List<Task> tasks = [];
            foreach (
                var dataType in applicationMetadata.DataTypes.Where(dt =>
                    dt.TaskId == taskId && dt.AppLogic?.ClassRef is not null
                )
            )
            {
                if (await _dataElementAccessChecker.CanRead(instance, dataType) is false)
                {
                    continue;
                }

                foreach (var dataElement in instance.Data.Where(de => de.DataType == dataType.Id))
                {
                    tasks.Add(
                        RemoveFieldsOnTaskComplete(dataMutator, taskId, applicationMetadata, dataElement, dataType)
                    );
                }
            }

            await Task.WhenAll(tasks);

            return new SuccessfulProcessEngineCommandResult();
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }

    private async Task RemoveFieldsOnTaskComplete(
        IInstanceDataMutator dataMutator,
        string taskId,
        ApplicationMetadata applicationMetadata,
        DataElement dataElement,
        DataType dataType,
        string? language = null
    )
    {
        var formDataWrapper = await dataMutator.GetFormDataWrapper(dataElement);

        // remove AltinnRowIds
        formDataWrapper.RemoveAltinnRowIds();

        var data = formDataWrapper.BackingData<object>();

        // Remove hidden data before validation, ignore hidden rows.
        if (_appSettings.Value?.RemoveHiddenData == true)
        {
            // Backend removal of data is deprecated in favor of
            // implementing frontend removal of hidden data, so
            // this is not updated to remove from multiple data models at once.
            LayoutEvaluatorState evaluationState = await _layoutEvaluatorStateInitializer.Init(
                dataMutator,
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
                dataMutator.AddFormDataElement(saveToDataType.Id, updatedData);
            }
            else
            {
                // Remove the shadow fields from the data using JsonSerializer
                var newData =
                    JsonSerializer.Deserialize(serializedData, data.GetType())
                    ?? throw new JsonException(
                        "Could not deserialize back datamodel after removing shadow fields. Data was \"null\""
                    );
                // SetFormData is internal, but we know the dataMutator is InstanceDataUnitOfWork
                if (dataMutator is Internal.Data.InstanceDataUnitOfWork unitOfWork)
                {
                    unitOfWork.SetFormData(dataElement, FormDataWrapperFactory.Create(newData));
                }
                else
                {
                    throw new InvalidOperationException(
                        "Data mutator does not support SetFormData for shadow field removal"
                    );
                }
            }
        }
    }
}
