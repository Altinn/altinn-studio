using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Pdf
{
    /// <summary>
    /// Interface for handling generation and storing of PDF's
    /// </summary>
    public interface IPdfService
    {
        /// <summary>
        /// Generate a PDF of what the user can currently see from the given instance of an app. Saves the PDF
        /// to storage as a new binary file associated with the predefined PDF data type in most apps.
        /// </summary>
        /// <param name="instance">The instance details.</param>
        /// <param name="taskId">The task id for witch the pdf is generated</param>
        /// <param name="ct">Cancellation Token for when a request should be stopped before it's completed.</param>
        Task GenerateAndStorePdf(Instance instance, string taskId, CancellationToken ct);

        /// <summary>
        /// Generate a PDF of what the user can currently see from the given instance of an app.
        /// </summary>
        /// <param name="instance">The instance details.</param>
        /// <param name="taskId">The task id for witch the pdf is generated</param>
        /// <param name="ct">Cancellation Token for when a request should be stopped before it's completed.</param>
        Task<Stream> GeneratePdf(Instance instance, string taskId, CancellationToken ct);
    }
}
