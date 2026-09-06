namespace Altinn.App.Core.Internal.Pdf;

/// <summary>
/// Describes what a PDF preview request should render, and which URL path segment (if any) the
/// generated page should be loaded at.
/// </summary>
/// <param name="TaskId">The task the preview renders.</param>
/// <param name="PathTaskId">
/// The task id to put in the generated page's URL path, e.g. <c>instance/{id}/{PathTaskId}?pdf=1</c>.
/// Null means the path should be omitted, which is correct when <paramref name="TaskId"/> is already the
/// instance's current task, so the frontend's default routing already lands there. Ignored when
/// <paramref name="SubformPdfContext"/> is set, since a subform preview always targets the task hosting
/// the subform component's layout, regardless of this value.
/// </param>
/// <param name="AutoPdfTaskIds">Tasks to auto-render into the PDF task's summary, when configured.</param>
/// <param name="SubformPdfContext">Set when the preview renders a single subform data element.</param>
internal sealed record PdfPreviewTarget(
    string TaskId,
    string? PathTaskId,
    List<string>? AutoPdfTaskIds,
    SubformPdfContext? SubformPdfContext
);
