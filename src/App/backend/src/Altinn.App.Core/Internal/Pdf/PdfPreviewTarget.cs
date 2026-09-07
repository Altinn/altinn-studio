namespace Altinn.App.Core.Internal.Pdf;

/// <summary>
/// Describes what a PDF preview request should render, and which URL path segment (if any) the
/// generated page should be loaded at.
/// </summary>
/// <param name="TaskId">The task whose PDF output is being previewed.</param>
/// <param name="PathTaskId">
/// The task id to put in the generated page's URL path, e.g. <c>instance/{id}/{PathTaskId}?pdf=1</c>.
/// Null means the path should be omitted, which is correct when <paramref name="TaskId"/> is already the
/// instance's current task, so the frontend's default routing already lands there. A subform preview
/// always includes its source task id, with the rendered UI folder specified in query parameters.
/// </param>
/// <param name="AutoPdfTaskIds">Tasks to auto-render into the PDF task's summary, when configured.</param>
/// <param name="Subform">The resolved UI folder and data element for a subform preview.</param>
internal sealed record PdfPreviewTarget(
    string TaskId,
    string? PathTaskId,
    List<string>? AutoPdfTaskIds,
    SubformPdfRenderTarget? Subform
);
