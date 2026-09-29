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
    /// The tasks to include in an automatically generated PDF. The pages of each task's UI folder are rendered in
    /// summary mode; <c>pdfLayoutName</c> on those tasks is not used.
    /// </summary>
    /// <remarks>
    /// A PDF service task needs either this list or a UI folder of its own (<c>ui/{pdfTaskId}</c>), which
    /// renders a custom PDF from that folder's <c>pdfLayoutName</c>, or from its pages when none is set. When
    /// the PDF service task's own UI folder has a <c>pdfLayoutName</c>, this list is ignored; combining the list
    /// with an own UI folder without one is not supported.
    /// </remarks>
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
