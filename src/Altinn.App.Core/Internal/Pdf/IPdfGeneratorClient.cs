#nullable enable

namespace Altinn.App.Core.Internal.Pdf;

/// <summary>
/// Defines the required operations on a client of the PDF generator service.
/// </summary>
public interface IPdfGeneratorClient
{
    /// <summary>
    /// Generates a PDF.
    /// </summary>
    /// <returns>A stream with the binary content of the generated PDF</returns>
    Task<Stream> GeneratePdf(Uri uri, CancellationToken ct);
}
