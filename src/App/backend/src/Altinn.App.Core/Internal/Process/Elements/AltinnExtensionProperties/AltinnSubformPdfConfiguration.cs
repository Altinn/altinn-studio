using System.Diagnostics.CodeAnalysis;
using System.Xml.Serialization;
using Altinn.App.Core.Internal.App;

namespace Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

/// <summary>
/// Configuration properties for subform PDF generation in a process task
/// </summary>
public class AltinnSubformPdfConfiguration
{
    /// <summary>
    /// Set the filename of the PDF using a text resource key.
    /// </summary>
    [XmlElement("filenameTextResourceKey", Namespace = "http://altinn.no/process")]
    public string? FilenameTextResourceKey { get; set; }

    /// <summary>
    /// The UI folder of the subform to render in the PDFs. Its <c>defaultDataType</c> is the data type of the
    /// subform entries, and the task generates a PDF for each of them.
    /// </summary>
    [XmlElement("subformUiFolder", Namespace = "http://altinn.no/process")]
    public string? SubformUiFolder { get; set; }

    internal ValidAltinnSubformPdfConfiguration Validate()
    {
        List<string>? errorMessages = null;

        string? normalizedFilename = string.IsNullOrWhiteSpace(FilenameTextResourceKey)
            ? null
            : FilenameTextResourceKey.Trim();

        if (SubformUiFolder.IsNullOrWhitespace(ref errorMessages, $"{nameof(SubformUiFolder)} is missing."))
            ThrowApplicationConfigException(errorMessages);

        return new ValidAltinnSubformPdfConfiguration(normalizedFilename, SubformUiFolder);
    }

    [DoesNotReturn]
    private static void ThrowApplicationConfigException(List<string> errorMessages)
    {
        throw new ApplicationConfigException(
            "Subform pdf service task configuration is not valid: " + string.Join(",\n", errorMessages)
        );
    }
}

internal readonly record struct ValidAltinnSubformPdfConfiguration(
    string? FilenameTextResourceKey,
    string SubformUiFolder
);
