using Altinn.App.Core.Features;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Internal.Pdf;

/// <summary>
/// Interface for handling generation and storing of PDF's
/// </summary>
public interface IPdfService
{
    /// <summary>
    /// Generate a PDF of what the user can currently see from the given instance of an app. Saves the PDF
    /// to storage as a new binary file associated with the predefined PDF data type in most apps.
    /// </summary>
    /// <param name="instanceDataMutator">The instance data mutator used for deferred storage.</param>
    /// <param name="customFileNameTextResourceKey">A text resource element id for the file name of the PDF. If null, a default file name will be used.</param>
    /// <param name="autoGeneratePdfForTaskIds">Enable auto-pdf for a list of tasks. Will not respect pdfLayoutName on those tasks, but use the main layout-set of the given tasks and render the components in summary mode. This setting will be ignored if the PDF task has a pdf layout set defined.</param>
    /// <param name="authenticationMethod">An optional specification of the authentication method to use for requests.</param>
    /// <param name="cancellationToken">Cancellation token for when a request should be stopped before it's completed.</param>
    /// <returns>The created binary data change representing the deferred PDF.</returns>
    Task<BinaryDataChange> GenerateAndStorePdf(
        IInstanceDataMutator instanceDataMutator,
        string? customFileNameTextResourceKey = null,
        List<string>? autoGeneratePdfForTaskIds = null,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Generate a PDF for a subform and store it via the instance data mutator. The stored PDF gets the metadata
    /// <c>subformComponentId</c> and <c>subformDataElementId</c> from the subform context, so it can be matched to its subform.
    /// </summary>
    /// <param name="instanceDataMutator">The instance data mutator used for deferred storage.</param>
    /// <param name="customFileNameTextResourceKey">A text resource element id for the file name of the PDF. If no text resource is found, the literal value will be used. If null, a default file name will be used.</param>
    /// <param name="subformPdfContext">The subform-specific context containing component and data element identifiers.</param>
    /// <param name="authenticationMethod">An optional specification of the authentication method to use for requests.</param>
    /// <param name="cancellationToken">Cancellation token for when a request should be stopped before it's completed.</param>
    /// <returns>The created binary data change representing the deferred PDF.</returns>
    Task<BinaryDataChange> GenerateAndStoreSubformPdf(
        IInstanceDataMutator instanceDataMutator,
        string? customFileNameTextResourceKey,
        SubformPdfContext subformPdfContext,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Generate a PDF using an existing instance data accessor.
    /// </summary>
    /// <param name="dataAccessor">The instance data accessor to read the instance and its data from.</param>
    /// <param name="taskId">The task id for which the PDF is generated</param>
    /// <param name="authenticationMethod">An optional specification of the authentication method to use for requests.</param>
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
