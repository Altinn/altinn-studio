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
    /// A PDF service task needs either this list or a UI folder of its own (<c>ui/{pdfTaskId}</c>) whose
    /// <c>pdfLayoutName</c> names the layout to render as a custom PDF. When <c>pdfLayoutName</c> is set, this list
    /// is ignored. The pages in that folder's <c>order</c> are never part of the PDF.
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
