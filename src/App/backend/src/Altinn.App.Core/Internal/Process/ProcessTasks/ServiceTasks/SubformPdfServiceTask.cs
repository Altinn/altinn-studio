using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.App.Core.Models.Layout.Components.Base;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using KeyValueEntry = Altinn.Platform.Storage.Interface.Models.KeyValueEntry;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;

/// <summary>
/// Generates one PDF per subform data element. There is deliberately no pre-generation cleanup
/// here: stale PDFs from a previous visit to the task are removed by the CleanupGeneratedFromTask
/// task-start command, and a failed attempt persists nothing (data changes commit only on callback
/// success), so any element this task could see in its state-blob instance is already gone. The one
/// remaining duplication window - a retry after a success the engine failed to record - cannot be
/// closed from the blob (it predates the lost save) and is accepted until Storage-side idempotent
/// aggregate mutations land (altinn-storage#1049).
/// </summary>
internal sealed class SubformPdfServiceTask(
    IProcessReader processReader,
    IPdfService pdfService,
    IAppResources appResources,
    ILogger<SubformPdfServiceTask> logger
) : IServiceTask
{
    public string Type => "subformPdf";

    public async Task<ServiceTaskResult> Execute(ServiceTaskContext context)
    {
        string taskId = context.InstanceDataMutator.Instance.Process.CurrentTask.ElementId;
        Instance instance = context.InstanceDataMutator.Instance;

        logger.LogDebug("Calling PdfService for Subform PDF Service Task {TaskId}.", taskId);

        // A configuration error does not go away on retry, so fail at once instead of letting the engine retry
        // until the workflow gives up.
        ValidAltinnSubformPdfConfiguration config;
        try
        {
            config = GetValidAltinnSubformPdfConfiguration(taskId);
        }
        catch (ApplicationConfigException e)
        {
            return ServiceTaskResult.FailedPermanent(e.Message);
        }

        string? filenameTextResourceKey = config.FilenameTextResourceKey;
        string subformComponentId = config.SubformComponentId;
        string subformDataTypeId = config.SubformDataTypeId;

        List<DataElement> subformDataElements = instance.Data.Where(x => x.DataType == subformDataTypeId).ToList();

        // A render the frontend rejects surfaces only as a PDF generator timeout. Checked only when there is
        // something to render, so an instance without subforms still completes. The analyzer reports the same at
        // build time (ALTINNAPP1004 and ALTINNAPP1005).
        if (subformDataElements.Count > 0 && GetUnrenderableConfigurationReason(taskId, config) is { } reason)
        {
            return ServiceTaskResult.FailedPermanent(reason);
        }

        // Generate PDFs sequentially
        foreach (DataElement dataElement in subformDataElements)
        {
            logger.LogDebug(
                "Starting PDF generation for subform data element {DataElementId} in task {TaskId}",
                dataElement.Id,
                taskId
            );

            var metadata = new List<KeyValueEntry>
            {
                new() { Key = "subformComponentId", Value = subformComponentId },
                new() { Key = "subformDataElementId", Value = dataElement.Id },
            };

            _ = await pdfService.GenerateAndStoreSubformPdf(
                context.InstanceDataMutator,
                filenameTextResourceKey,
                new SubformPdfContext(subformComponentId, dataElement.Id),
                metadata: metadata,
                authenticationMethod: StorageAuthenticationMethod.ServiceOwner(),
                cancellationToken: context.CancellationToken
            );

            logger.LogDebug(
                "Completed PDF generation for subform data element {DataElementId} in task {TaskId}",
                dataElement.Id,
                taskId
            );
        }

        logger.LogDebug("Successfully called PdfService for Subform PDF Service Task {TaskId}.", taskId);

        return new ServiceTaskSuccessResult();
    }

    private ValidAltinnSubformPdfConfiguration GetValidAltinnSubformPdfConfiguration(string taskId)
    {
        AltinnTaskExtension? altinnTaskExtension = processReader.GetAltinnTaskExtension(taskId);
        AltinnSubformPdfConfiguration? subformPdfConfiguration = altinnTaskExtension?.SubformPdfConfiguration;

        if (subformPdfConfiguration == null)
        {
            throw new ApplicationConfigException(
                "The subformPdfConfig node is missing in the subform pdf process task configuration."
            );
        }

        return subformPdfConfiguration.Validate();
    }

    /// <summary>
    /// Why the frontend cannot render the subform PDFs for this task, or null when it can - or when the layouts
    /// cannot be read, so this check never blocks what would otherwise have been attempted. The frontend renders
    /// each data element at <c>{taskId}/subform/{subformComponentId}/{dataElementId}</c>: it looks the component up
    /// in this service task's own UI folder, requires it to be a Subform component, and renders the data element
    /// with the <c>defaultDataType</c> of the component's layout set.
    /// </summary>
    private string? GetUnrenderableConfigurationReason(string taskId, ValidAltinnSubformPdfConfiguration config)
    {
        LayoutModel? layoutModel;
        try
        {
            layoutModel = appResources.GetLayoutModelForFolder(taskId);
        }
        catch (Exception e)
        {
            logger.LogWarning(
                e,
                "Could not read the layouts to check Subform PDF Service Task {TaskId}; generating anyway.",
                taskId
            );
            return null;
        }

        if (layoutModel is null)
        {
            return ComponentNotFound(taskId, config.SubformComponentId, $"there is no UI folder 'ui/{taskId}'");
        }

        BaseComponent? component = layoutModel.AllComponents.FirstOrDefault(c => c.Id == config.SubformComponentId);
        if (component is null)
        {
            return ComponentNotFound(
                taskId,
                config.SubformComponentId,
                $"no layout in 'ui/{taskId}' has a component with that id"
            );
        }

        if (component is not SubFormComponent subform)
        {
            return ComponentNotFound(
                taskId,
                config.SubformComponentId,
                $"it is a '{component.Type}' component, not a Subform component"
            );
        }

        string? subformDataType = appResources.GetLayoutSettingsForFolder(subform.LayoutSetId)?.DefaultDataType;
        if (subformDataType is null)
        {
            return ComponentNotFound(
                taskId,
                config.SubformComponentId,
                $"its layoutSet '{subform.LayoutSetId}' is not a UI folder with a defaultDataType"
            );
        }

        if (subformDataType != config.SubformDataTypeId)
        {
            return $"Subform PDF service task '{taskId}' generates PDFs for data type '{config.SubformDataTypeId}', "
                + $"but its subform component '{config.SubformComponentId}' shows data type '{subformDataType}' (the "
                + $"defaultDataType of 'ui/{subform.LayoutSetId}'). Set <altinn:subformDataTypeId> to "
                + $"'{subformDataType}'.";
        }

        return null;
    }

    private static string ComponentNotFound(string taskId, string componentId, string reason) =>
        $"Subform PDF service task '{taskId}' renders the component '{componentId}', but {reason}, so its PDFs "
        + "cannot be generated. The frontend looks the component up in the service task's own UI folder "
        + $"'ui/{taskId}'.";
}
