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
    private readonly IAppResources _appResources;
    private readonly ILayoutEvaluatorStateInitializer _layoutEvaluatorStateInitializer;
    private readonly IOptions<AppSettings> _appSettings;
    private readonly IDataElementAccessChecker _dataElementAccessChecker;

    public CommonTaskFinalization(
        IAppMetadata appMetadata,
        IAppModel appModel,
        IAppResources appResources,
        ILayoutEvaluatorStateInitializer layoutEvaluatorStateInitializer,
        IOptions<AppSettings> appSettings,
        IDataElementAccessChecker dataElementAccessChecker
    )
    {
        _appMetadata = appMetadata;
        _appModel = appModel;
        _appResources = appResources;
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
            ApplicationMetadata applicationMetadata = _appMetadata.ApplicationMetadata;

            List<(DataElement DataElement, DataType DataType)> formDataElements = [];
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
                    formDataElements.Add((dataElement, dataType));
                }
            }

            // Only for a task with form data the user can read.
            // Without layouts for the task there are no components, so nothing is hidden.
            if (
                formDataElements.Count > 0
                && _appSettings.Value.RemoveHiddenData
                && _appResources.GetLayoutSettingsForFolder(taskId) is not null
            )
            {
                await RemoveHiddenDataOnTaskComplete(dataMutator, taskId);
            }

            await Task.WhenAll(
                formDataElements.Select(formData =>
                    RemoveFieldsOnTaskComplete(
                        dataMutator,
                        applicationMetadata,
                        formData.DataElement,
                        formData.DataType
                    )
                )
            );

            return new SuccessfulProcessEngineCommandResult();
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }

    /// <summary>
    /// Remove the attachments and the form data that only hidden components refer to. One evaluation of the layout
    /// covers all the data models and attachments in the task, so each component's hidden expression is evaluated
    /// once.
    /// </summary>
    private async Task RemoveHiddenDataOnTaskComplete(IInstanceDataMutator dataMutator, string taskId)
    {
        LayoutEvaluatorState evaluationState = await _layoutEvaluatorStateInitializer.Init(
            dataMutator,
            taskId,
            gatewayAction: null,
            language: null
        );

        // Before the form data, because removing a hidden row also removes the attachment ids in it
        foreach (var attachment in await LayoutEvaluator.GetHiddenAttachmentsForRemoval(evaluationState, taskId))
        {
            if (UserCanDelete(dataMutator.GetDataType(attachment)))
            {
                dataMutator.RemoveDataElement(attachment);
            }
        }

        await LayoutEvaluator.RemoveHiddenData(
            evaluationState,
            RowRemovalOption.DeleteRow,
            evaluateRemoveWhenHidden: true
        );
    }

    /// <summary>
    /// Whether the data type lets the user delete its attachments in the form. Types that only the app, or only users
    /// with a given action, may read or change are kept. <see cref="IDataElementAccessChecker.CanDelete"/> can't tell
    /// here, as it refuses every change while the instance is processing.
    /// </summary>
    private static bool UserCanDelete(DataType dataType)
    {
#pragma warning disable CS0618 // Type or member is obsolete
        return dataType.AppLogic?.DisallowUserDelete is not true
            && string.IsNullOrWhiteSpace(dataType.ActionRequiredToRead)
            && string.IsNullOrWhiteSpace(dataType.ActionRequiredToWrite)
            && dataType.AllowedContributors is not { Count: > 0 }
            && dataType.AllowedContributers is not { Count: > 0 };
#pragma warning restore CS0618 // Type or member is obsolete
    }

    private async Task RemoveFieldsOnTaskComplete(
        IInstanceDataMutator dataMutator,
        ApplicationMetadata applicationMetadata,
        DataElement dataElement,
        DataType dataType
    )
    {
        var formDataWrapper = await dataMutator.GetFormDataWrapper(dataElement);

        // remove AltinnRowIds
        formDataWrapper.RemoveAltinnRowIds();

        var data = formDataWrapper.BackingData<object>();

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
                    unitOfWork.SetFormData(dataElement, FormDataWrapperFactory.Create(newData, dataType, dataElement));
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
