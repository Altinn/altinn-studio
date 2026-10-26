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
    /// <returns>The binary content of the generated PDF.</returns>
    Task<byte[]> GeneratePdf(Uri uri, CancellationToken cancellationToken);

    /// <summary>
    /// Generates a PDF.
    /// </summary>
    /// <returns>The binary content of the generated PDF with a footer.</returns>
    Task<byte[]> GeneratePdf(Uri uri, string? footerContent, CancellationToken cancellationToken);

    /// <summary>
    /// Generates a PDF.
    /// </summary>
    /// <returns>The binary content of the generated PDF with a footer.</returns>
    Task<byte[]> GeneratePdf(
        Uri uri,
        string? footerContent,
        StorageAuthenticationMethod? authenticationMethod,
        CancellationToken cancellationToken
    ) => GeneratePdf(uri, footerContent, cancellationToken);
}
