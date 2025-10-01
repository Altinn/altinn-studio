using Altinn.Platform.Storage.Interface.Models;

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
    /// <param name="instance">The instance details.</param>
    /// <param name="taskId">The task id for witch the pdf is generated</param>
    /// <param name="ct">Cancellation token for when a request should be stopped before it's completed.</param>
    Task GenerateAndStorePdf(Instance instance, string taskId, CancellationToken ct);

    /// <summary>
    /// Generate a PDF of what the user can currently see from the given instance of an app.
    /// </summary>
    /// <param name="instance">The instance details.</param>
    /// <param name="taskId">The task id for witch the pdf is generated</param>
    /// <param name="ct">Cancellation token for when a request should be stopped before it's completed.</param>
    Task<Stream> GeneratePdf(Instance instance, string taskId, CancellationToken ct);

    // <inheritdoc cref="GeneratePdf(Instance, string, CancellationToken)" select="summary"/>
    /// <param name="instance">
    ///   <inheritdoc cref="GeneratePdf(Instance, string, CancellationToken)" path="/param[@name='instance']"/>
    /// </param>
    /// <param name="taskId">
    ///   <inheritdoc cref="GeneratePdf(Instance, string, CancellationToken)" path="/param[@name='taskId']"/>
    /// </param>
    /// <param name="ct">
    ///   <inheritdoc cref="GeneratePdf(Instance, string, CancellationToken)" path="/param[@name='ct']"/>
    /// </param>
    /// <param name="isPreview">Indicates whether the PDF is a preview version.</param>
    Task<Stream> GeneratePdf(Instance instance, string taskId, bool isPreview, CancellationToken ct);
}
