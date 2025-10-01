namespace Altinn.App.Core.Models.Pdf;

/// <summary>
/// This class is created to match the input required to generate a PDF by the PDF generator service.
/// </summary>
internal class PdfGeneratorRequest
{
    /// <summary>
    /// The Url that the PDF generator will used to obtain the HTML needed to created the PDF.
    /// </summary>
    public string Url { get; set; } = string.Empty;

    /// <summary>
    /// PDF generator request options.
    /// </summary>
    public PdfGeneratorRequestOptions Options { get; set; } = new();

    /// <summary>
    /// Indicate whether javascript should be enabled. Default is true. This is also required when the HTML
    /// is created by a React application.
    /// </summary>
    public bool SetJavaScriptEnabled { get; set; } = true;

    /// <summary>
    /// Defines how puppeteer should wait before starting triggering PDF rendering.
    /// </summary>
    public object? WaitFor { get; set; } = null;

    /// <summary>
    /// Provides a list of cookies Puppeteer will need to create before sending the request.
    /// </summary>
    public List<PdfGeneratorCookieOptions> Cookies { get; set; } = new();
}
