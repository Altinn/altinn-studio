namespace Altinn.App.Api.Models;

/// <summary>
/// Response object for GET to /org/app/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/pdf/preview/tasks —
/// the PDF and subformPdf service tasks in the instance's process that can be previewed, used by the
/// frontend developer tools to offer a task/data element picker.
/// </summary>
public sealed class PdfPreviewTasksResponse
{
    /// <summary>
    /// The previewable PDF and subformPdf service tasks, in process order.
    /// </summary>
    public required List<PdfPreviewTask> Tasks { get; init; }
}

/// <summary>
/// A single previewable PDF or subformPdf service task.
/// </summary>
public sealed class PdfPreviewTask
{
    /// <summary>
    /// The task's BPMN element id.
    /// </summary>
    public required string TaskId { get; init; }

    /// <summary>
    /// The task's BPMN display name, if any.
    /// </summary>
    public string? Name { get; init; }

    /// <summary>
    /// The Altinn task type, either <c>pdf</c> or <c>subformPdf</c>.
    /// </summary>
    public required string TaskType { get; init; }

    /// <summary>
    /// The task ids configured to be auto-rendered into the PDF, if any. Only set for <c>pdf</c> tasks.
    /// </summary>
    public List<string>? AutoPdfTaskIds { get; init; }

    /// <summary>
    /// The id of the subform component this task renders. Only set for <c>subformPdf</c> tasks.
    /// </summary>
    public string? SubformComponentId { get; init; }

    /// <summary>
    /// The data type of the subform data elements this task renders. Only set for <c>subformPdf</c> tasks.
    /// </summary>
    public string? SubformDataTypeId { get; init; }

    /// <summary>
    /// The instance's data elements matching <see cref="SubformDataTypeId"/>, one PDF preview per element.
    /// Only set for <c>subformPdf</c> tasks.
    /// </summary>
    public List<PdfPreviewDataElement>? DataElements { get; init; }
}

/// <summary>
/// A data element that can be previewed as a subform PDF.
/// </summary>
public sealed class PdfPreviewDataElement
{
    /// <summary>
    /// The data element's id.
    /// </summary>
    public required string Id { get; init; }

    /// <summary>
    /// The data element's data type.
    /// </summary>
    public required string DataType { get; init; }
}
