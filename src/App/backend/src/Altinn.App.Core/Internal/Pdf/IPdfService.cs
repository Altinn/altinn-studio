using Altinn.App.Core.Features;

namespace Altinn.App.Core.Internal.Pdf;

/// <summary>
/// Generates PDFs of an instance with the PDF generator and returns them. The caller decides what to do with a PDF,
/// such as adding it to the instance with a file name from <see cref="IPdfFileNameResolver"/>.
/// </summary>
public interface IPdfService
{
    /// <summary>
    /// Generate a PDF of the current task.
    /// </summary>
    /// <param name="dataAccessor">The instance data accessor to read the instance and its data from.</param>
    /// <param name="taskId">The id of the current task.</param>
    /// <param name="autoGeneratePdfForTaskIds">Tasks to render in the PDF as summaries of their main UI folders, instead of their PDF layouts. Ignored if the PDF task has a UI folder of its own.</param>
    /// <param name="authenticationMethod">The authentication method to use for requests, or null for the default.</param>
    /// <param name="cancellationToken">Cancellation token for when a request should be stopped before it's completed.</param>
    Task<Stream> GeneratePdf(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        List<string>? autoGeneratePdfForTaskIds = null,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Generate a PDF of one subform, as a subform PDF service task does.
    /// </summary>
    /// <param name="dataAccessor">The instance data accessor to read the instance and its data from.</param>
    /// <param name="taskId">The id of the current task, a subform PDF service task.</param>
    /// <param name="subformPdfContext">The subform to generate the PDF of.</param>
    /// <param name="authenticationMethod">The authentication method to use for requests, or null for the default.</param>
    /// <param name="cancellationToken">Cancellation token for when a request should be stopped before it's completed.</param>
    Task<Stream> GenerateSubformPdf(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        SubformPdfContext subformPdfContext,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Generate a preview of the PDF a task produces, marked as a preview in its footer. The task does not have to be
    /// the current task, so a PDF service task can be previewed before the instance reaches it. The preview is in the
    /// language of the data accessor, or in the user's language if it has none.
    /// </summary>
    /// <param name="dataAccessor">The instance data accessor to read the instance and its data from.</param>
    /// <param name="taskId">The task to preview, such as the current task or a PDF service task.</param>
    /// <param name="autoGeneratePdfForTaskIds">The tasks to auto-generate the PDF from, as configured on a PDF service task.</param>
    /// <param name="cancellationToken">Cancellation token for when a request should be stopped before it's completed.</param>
    Task<Stream> GeneratePreviewPdf(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        List<string>? autoGeneratePdfForTaskIds = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Generate a preview of the PDF a subform PDF service task produces for one subform, marked as a preview in its
    /// footer. The instance does not have to have reached the task. The preview is in the language of the data
    /// accessor, or in the user's language if it has none.
    /// </summary>
    /// <param name="dataAccessor">The instance data accessor to read the instance and its data from.</param>
    /// <param name="taskId">The subform PDF service task to preview.</param>
    /// <param name="subformPdfContext">The subform to preview.</param>
    /// <param name="cancellationToken">Cancellation token for when a request should be stopped before it's completed.</param>
    Task<Stream> GenerateSubformPreviewPdf(
        IInstanceDataAccessor dataAccessor,
        string taskId,
        SubformPdfContext subformPdfContext,
        CancellationToken cancellationToken = default
    );
}
