using Altinn.App.Core.Features;

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

    /// <summary>
    /// Generates a PDF.
    /// </summary>
    /// <returns>A stream with the binary content of the generated PDF with a footer</returns>
    Task<Stream> GeneratePdf(Uri uri, string? footerContent, CancellationToken ct);

    /// <summary>
    /// Generates a PDF.
    /// </summary>
    /// <returns>A stream with the binary content of the generated PDF with a footer</returns>
    Task<Stream> GeneratePdf(
        Uri uri,
        string? footerContent,
        StorageAuthenticationMethod? authenticationMethod,
        CancellationToken ct
    ) => GeneratePdf(uri, footerContent, ct);
}
