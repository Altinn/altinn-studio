using System.Xml.Serialization;

namespace Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

/// <summary>
/// Configuration properties for PDF in a process task
/// </summary>
public sealed class AltinnPdfConfiguration
{
    /// <summary>
    /// Set the filename of the PDF using a text resource key.
    /// </summary>
    [XmlElement("filenameTextResourceKey", Namespace = "http://altinn.no/process")]
    public string? FilenameTextResourceKey { get; set; }

    /// <summary>
    /// Enable auto-pdf for a list of tasks. Will not respect pdfLayoutName on those tasks, but use the main layout-set of the given tasks and render the components in summary mode. This setting will be ignored if the PDF task has a pdf layout set defined.
    /// </summary>
    [XmlArray(ElementName = "autoPdfTaskIds", Namespace = "http://altinn.no/process", IsNullable = true)]
    [XmlArrayItem(ElementName = "taskId", Namespace = "http://altinn.no/process")]
    public List<string>? AutoPdfTaskIds { get; set; } = [];

    internal ValidAltinnPdfConfiguration Validate()
    {
        string? normalizedFilename = string.IsNullOrWhiteSpace(FilenameTextResourceKey)
            ? null
            : FilenameTextResourceKey.Trim();

        return new ValidAltinnPdfConfiguration(normalizedFilename, AutoPdfTaskIds);
    }
}

internal readonly record struct ValidAltinnPdfConfiguration(
    string? FilenameTextResourceKey,
    List<string>? AutoPdfTaskIds
);
