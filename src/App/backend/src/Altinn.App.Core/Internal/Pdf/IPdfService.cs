using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Pdf;

/// <summary>
/// Generates PDFs of an instance with the PDF generator and returns them. The PDF generator opens the app and renders
/// the instance as it is stored, so changes that are not saved yet are not in the PDF. The caller decides what to do
/// with a PDF, such as adding it to the instance with a file name from <see cref="IPdfFileNameResolver"/>.
/// </summary>
public interface IPdfService
{
    /// <summary>
    /// Generate a PDF of a task. The task does not have to be the current task, so a PDF service task can be rendered
    /// before the instance reaches it.
    /// </summary>
    /// <param name="instance">The instance to generate the PDF of.</param>
    /// <param name="taskId">The task to render, such as the current task.</param>
    /// <param name="autoGeneratePdfForTaskIds">Tasks to render in the PDF as summaries of their main UI folders, instead of their PDF layouts. Ignored if the PDF task has a UI folder of its own.</param>
    /// <param name="language">The language of the PDF, such as nb or en. If null, the authenticated user's language is used, or nb if a user isn't authenticated.</param>
    /// <param name="isPreview">Whether to mark the PDF as a preview in its footer, instead of using the footer from the PDF generator settings.</param>
    /// <param name="authenticationMethod">The authentication method to use for requests, or null for the default.</param>
    /// <param name="cancellationToken">Cancellation token for when a request should be stopped before it's completed.</param>
    Task<byte[]> GeneratePdf(
        Instance instance,
        string taskId,
        List<string>? autoGeneratePdfForTaskIds = null,
        string? language = null,
        bool isPreview = false,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Generate a PDF of one subform, as a subform PDF service task does. The instance does not have to have reached
    /// the task.
    /// </summary>
    /// <param name="instance">The instance to generate the PDF of.</param>
    /// <param name="taskId">The subform PDF service task to render.</param>
    /// <param name="subformPdfContext">The subform to generate the PDF of.</param>
    /// <param name="language">The language of the PDF, such as nb or en. If null, the authenticated user's language is used, or nb if a user isn't authenticated.</param>
    /// <param name="isPreview">Whether to mark the PDF as a preview in its footer, instead of using the footer from the PDF generator settings.</param>
    /// <param name="authenticationMethod">The authentication method to use for requests, or null for the default.</param>
    /// <param name="cancellationToken">Cancellation token for when a request should be stopped before it's completed.</param>
    Task<byte[]> GenerateSubformPdf(
        Instance instance,
        string taskId,
        SubformPdfContext subformPdfContext,
        string? language = null,
        bool isPreview = false,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );
}
