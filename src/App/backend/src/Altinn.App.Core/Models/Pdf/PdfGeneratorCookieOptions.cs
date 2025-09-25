namespace Altinn.App.Core.Models.Pdf;

/// <summary>
/// This class is created to match the PDF generator cookie options.
/// </summary>
internal class PdfGeneratorCookieOptions
{
    /// <summary>
    /// The name of the cookie.
    /// </summary>
    public string Name { get; set; } = "AltinnStudioRuntime";

    /// <summary>
    /// The cookie content.
    /// </summary>
    public string Value { get; set; } = string.Empty;

    /// <summary>
    /// The cookie domain.
    /// </summary>
    public string Domain { get; set; } = string.Empty;

    /// <summary>
    /// The cookie sameSite settings.
    /// </summary>
    public string SameSite { get; } = "Lax";
}
