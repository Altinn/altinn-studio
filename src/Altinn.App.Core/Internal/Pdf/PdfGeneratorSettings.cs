namespace Altinn.App.Core.Internal.Pdf;

/// <summary>
/// Represents a set of settings and options used by the PDF generator client.
/// </summary>
public class PdfGeneratorSettings
{
    /// <summary>
    /// The endpoint uri for the PDF generator service.
    /// </summary>
    public string ServiceEndpointUri { get; set; } = string.Empty;

    /// <summary>
    /// The URI that the PDF generator should use when asking the APP for a print.<br/>
    /// </summary>
    /// <remarks>
    /// The app logic will perform string replacement for a specific set of tokens. (Tokens can be omitted):
    /// org - will be taken from current instance.Org.
    /// hostName - will be taken from GeneralSettings.HostName.
    /// appId - will be taken from current instance.AppId.
    /// instanceId - will be taken from current instance.Id.
    /// </remarks>
    public string AppPdfPageUriTemplate { get; set; } =
        "https://{org}.apps.{hostName}/{appId}/#/instance/{instanceId}";

    /// <summary>
    /// The name of a DOM element to wait for before triggering PDF-generator.
    /// </summary>
    public string WaitForSelector { get; set; } = "#readyForPrint";

    /// <summary>
    /// The number of milliseconds the PDF-generator should wait for a page to render. Default is 5000.
    /// </summary>
    /// <remarks>This will be ignored if <see cref="WaitForSelector"/> has been assigned a value.</remarks>
    public int WaitForTime { get; set; } = 5000;
}
