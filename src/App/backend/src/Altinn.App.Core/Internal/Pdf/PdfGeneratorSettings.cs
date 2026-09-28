namespace Altinn.App.Core.Internal.Pdf;

/// <summary>
/// Represents a set of settings and options used by the PDF generator client.
/// </summary>
public class PdfGeneratorSettings
{
    /// <summary>
    /// The path part of URI that the PDF generator should use when asking the APP for a print with {instanceid} replaced with `instance.Id`.<br/>
    /// </summary>
    /// <remarks>
    /// {instanceid} will be on the form {instanceownerId}/{instanceGuid}
    /// eg: 123456/e7e56353-a935-443d-b2dd-7d41739e7d1c
    /// </remarks>
    public string AppPdfPagePathTemplate { get; set; } = "instance/{instanceId}?pdf=1";

    /// <summary>
    /// The name of a DOM element to wait for before triggering PDF-generator.
    /// </summary>
    public string WaitForSelector { get; set; } = "#readyForPrint";

    /// <summary>
    /// The number of milliseconds the PDF-generator should wait for a page to render. Default is 5000.
    /// </summary>
    /// <remarks>This will be ignored if <see cref="WaitForSelector"/> has been assigned a value.</remarks>
    public int WaitForTime { get; set; } = 5000;

    /// <summary>
    /// Shows a footer on each page in the PDF with the date, altinn-reference, page number and total pages.
    /// </summary>
    public bool DisplayFooter { get; set; }

    /// <summary>
    /// The number of PDF previews that can be generated for an instance per minute. Further requests get
    /// 429 Too Many Requests until the minute is over. Each running copy of the app counts in memory. Set to 0 to
    /// turn the limit off. Default is 10.
    /// </summary>
    public int PreviewRequestsPerMinute { get; set; } = 10;
}
