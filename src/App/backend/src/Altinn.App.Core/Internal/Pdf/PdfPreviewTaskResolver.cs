using Altinn.App.Core.Constants;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Pdf;

/// <summary>
/// Resolves a PDF preview request (an optional task id and an optional data element id) to a
/// <see cref="PdfPreviewTarget"/> describing what should be rendered, or throws a
/// <see cref="PdfPreviewException"/> the API layer can turn into a problem details response.
/// </summary>
internal sealed class PdfPreviewTaskResolver
{
    private readonly IProcessReader _processReader;
    private readonly IAppResources _resources;
    private readonly SubformPdfTargetResolver _subformResolver;

    /// <summary>
    /// Initializes a new instance of the <see cref="PdfPreviewTaskResolver"/> class.
    /// </summary>
    public PdfPreviewTaskResolver(
        IProcessReader processReader,
        IAppResources resources,
        SubformPdfTargetResolver? subformResolver = null
    )
    {
        _processReader = processReader;
        _resources = resources;
        _subformResolver = subformResolver ?? new SubformPdfTargetResolver(resources);
    }

    /// <summary>
    /// Resolves the given preview request against the instance's process.
    /// </summary>
    /// <param name="instance">The instance being previewed.</param>
    /// <param name="taskId">
    /// The task to preview, or null to fall back to a subform task found for <paramref name="dataElementId"/>,
    /// or the instance's current task.
    /// </param>
    /// <param name="dataElementId">
    /// The data element to preview a subform PDF for. Only applicable when the resolved task is a
    /// subformPdf service task.
    /// </param>
    public PdfPreviewTarget Resolve(Instance instance, string? taskId, string? dataElementId)
    {
        if (dataElementId is not null && taskId is null)
        {
            taskId = ResolveSubformPdfTaskIdFromDataElement(instance, dataElementId);
        }

        taskId ??= instance.Process?.CurrentTask?.ElementId;
        if (taskId is null)
        {
            throw new PdfPreviewException(404, "Instance has no current task");
        }

        if (_processReader.GetFlowElement(taskId) is not ProcessTask processTask)
        {
            throw new PdfPreviewException(404, $"Task '{taskId}' not found in process");
        }

        string? currentTaskId = instance.Process?.CurrentTask?.ElementId;

        // Read the task type straight off the element: IProcessReader.GetAltinnTaskExtension throws for a
        // task without extensionElements, and such a task should simply get the default (own layout) preview.
        string? taskType = processTask.ExtensionElements?.TaskExtension?.TaskType;

        return taskType switch
        {
            AltinnTaskTypes.SubformPdf => ResolveSubformPdfTarget(instance, taskId, dataElementId),
            AltinnTaskTypes.Pdf => ResolvePdfTarget(taskId, currentTaskId, dataElementId),
            _ => ResolveDefaultTarget(taskId, currentTaskId, dataElementId),
        };
    }

    private string ResolveSubformPdfTaskIdFromDataElement(Instance instance, string dataElementId)
    {
        DataElement element = FindDataElement(instance, dataElementId);

        // Read the extension straight off the task instead of going through GetAltinnTaskExtension, which
        // throws for any task lacking extensionElements entirely (fine for a task we already know is a
        // subformPdf task, not fine while scanning every task in the process for one).
        List<string> candidates = _processReader
            .GetProcessTasks()
            .Select(task => (task.Id, Extension: task.ExtensionElements?.TaskExtension))
            .Where(t =>
                t.Extension?.TaskType == AltinnTaskTypes.SubformPdf
                && t.Extension.SubformPdfConfiguration?.SubformDataTypeId == element.DataType
            )
            .Select(t => t.Id)
            .ToList();

        return candidates.Count switch
        {
            0 => throw new PdfPreviewException(
                404,
                $"No subformPdf service task is configured for data type '{element.DataType}'"
            ),
            1 => candidates[0],
            _ => throw new PdfPreviewException(
                400,
                $"Several subformPdf service tasks are configured for data type '{element.DataType}'; specify taskId explicitly"
            ),
        };
    }

    private static DataElement FindDataElement(Instance instance, string dataElementId)
    {
        return instance.Data?.Find(d => d.Id == dataElementId)
            ?? throw new PdfPreviewException(404, $"Data element '{dataElementId}' not found on instance");
    }

    private PdfPreviewTarget ResolveSubformPdfTarget(Instance instance, string taskId, string? dataElementId)
    {
        AltinnTaskExtension? extension = _processReader.GetAltinnTaskExtension(taskId);
        ValidAltinnSubformPdfConfiguration config =
            extension?.SubformPdfConfiguration?.Validate()
            ?? throw new PdfPreviewException(400, $"Task '{taskId}' has no valid subformPdfConfig");

        if (dataElementId is null)
        {
            throw new PdfPreviewException(400, "Previewing a subformPdf task requires dataElementId");
        }

        DataElement element = FindDataElement(instance, dataElementId);
        if (element.DataType != config.SubformDataTypeId)
        {
            throw new PdfPreviewException(
                400,
                $"Data element '{dataElementId}' has data type '{element.DataType}', but task '{taskId}' is configured for data type '{config.SubformDataTypeId}'"
            );
        }

        return new PdfPreviewTarget(
            taskId,
            PathTaskId: taskId,
            AutoPdfTaskIds: null,
            Subform: _subformResolver.Resolve(config.SubformComponentId, element)
        );
    }

    private PdfPreviewTarget ResolvePdfTarget(string taskId, string? currentTaskId, string? dataElementId)
    {
        if (dataElementId is not null)
        {
            throw new PdfPreviewException(400, "dataElementId is not applicable when previewing a pdf task");
        }

        AltinnTaskExtension? extension = _processReader.GetAltinnTaskExtension(taskId);
        ValidAltinnPdfConfiguration config =
            extension?.PdfConfiguration?.Validate() ?? new ValidAltinnPdfConfiguration();

        bool hasFolder = _resources.GetLayoutSettingsForFolder(taskId) is not null;
        bool hasAutoPdfTaskIds = config.AutoPdfTaskIds is { Count: > 0 };
        if (!hasFolder && !hasAutoPdfTaskIds)
        {
            throw new PdfPreviewException(
                400,
                $"PDF task '{taskId}' has neither a UI folder (App/ui/{taskId}) nor autoPdfTaskIds, so there is nothing to render"
            );
        }

        return new PdfPreviewTarget(
            taskId,
            PathTaskId: taskId != currentTaskId ? taskId : null,
            AutoPdfTaskIds: hasAutoPdfTaskIds ? config.AutoPdfTaskIds : null,
            Subform: null
        );
    }

    private static PdfPreviewTarget ResolveDefaultTarget(string taskId, string? currentTaskId, string? dataElementId)
    {
        if (dataElementId is not null)
        {
            throw new PdfPreviewException(400, "dataElementId is only applicable when previewing a subformPdf task");
        }

        return new PdfPreviewTarget(
            taskId,
            PathTaskId: taskId != currentTaskId ? taskId : null,
            AutoPdfTaskIds: null,
            Subform: null
        );
    }
}
