using Altinn.App.Core.Features;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Internal.Pdf;

/// <summary>
/// Generates PDFs of an instance with the PDF generator. A PDF is either added to the instance through a data
/// mutator, returned, or returned as a preview.
/// </summary>
public interface IPdfService
{
    /// <summary>
    /// Generate a PDF of the current task and add it to the instance through the data mutator. The PDF is saved to
    /// Storage when the mutator's changes are saved.
    /// </summary>
    /// <param name="instanceDataMutator">The data mutator to add the PDF to.</param>
    /// <param name="customFileNameTextResourceKey">A text resource key for the file name of the PDF. If null, or no text resource has the key, a default file name is used.</param>
    /// <param name="autoGeneratePdfForTaskIds">Tasks to render in the PDF as summaries of their main UI folders, instead of their PDF layouts. Ignored if the PDF task has a UI folder of its own.</param>
    /// <param name="authenticationMethod">The authentication method to use for requests, or null for the default.</param>
    /// <param name="cancellationToken">Cancellation token for when a request should be stopped before it's completed.</param>
    /// <returns>The change that adds the PDF.</returns>
    Task<BinaryDataChange> GenerateAndAddPdf(
        IInstanceDataMutator instanceDataMutator,
        string? customFileNameTextResourceKey = null,
        List<string>? autoGeneratePdfForTaskIds = null,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Generate a PDF of one subform and add it to the instance through the data mutator, with the metadata
    /// <c>subformComponentId</c> and <c>subformDataElementId</c> from the subform context. The PDF is saved to Storage
    /// when the mutator's changes are saved.
    /// </summary>
    /// <param name="instanceDataMutator">The data mutator to add the PDF to.</param>
    /// <param name="customFileNameTextResourceKey">A text resource key for the file name of the PDF. If null, or no text resource has the key, a default file name is used.</param>
    /// <param name="subformPdfContext">The subform to generate the PDF of.</param>
    /// <param name="authenticationMethod">The authentication method to use for requests, or null for the default.</param>
    /// <param name="cancellationToken">Cancellation token for when a request should be stopped before it's completed.</param>
    /// <returns>The change that adds the PDF.</returns>
    Task<BinaryDataChange> GenerateAndAddSubformPdf(
        IInstanceDataMutator instanceDataMutator,
        string? customFileNameTextResourceKey,
        SubformPdfContext subformPdfContext,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Generate a PDF of the current task and return it, without adding it to the instance.
    /// </summary>
    /// <param name="dataAccessor">The instance data accessor to read the instance and its data from.</param>
    /// <param name="taskId">The id of the current task.</param>
    /// <param name="authenticationMethod">The authentication method to use for requests, or null for the default.</param>
    /// <param name="cancellationToken">Cancellation token for when a request should be stopped before it's completed.</param>
    Task<Stream> GeneratePdf(
        IInstanceDataAccessor dataAccessor,
        string taskId,
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
