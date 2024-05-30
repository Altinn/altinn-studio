using Altinn.App.Core.Features.FileAnalyzis;

namespace Altinn.App.Core.Features.FileAnalysis;

/// <summary>
/// Results from a file analysis done based the content of the file, ie. the binary data.
/// </summary>
public class FileAnalysisResult
{
    /// <summary>
    /// Initializes a new instance of the <see cref="FileAnalysisService"/> class.
    /// </summary>
    public FileAnalysisResult(string analyserId)
    {
        AnalyserId = analyserId;
    }

    /// <summary>
    /// The id of the analyser generating the result.
    /// </summary>
    public string AnalyserId { get; internal set; }

    /// <summary>
    /// The name of the analysed file.
    /// </summary>
    public string? Filename { get; set; }

    /// <summary>
    /// The file extension(s) without the . i.e. pdf | png | docx
    /// Some mime types might have multiple extensions registered for ecample image/jpeg has both jpg and jpeg.
    /// </summary>
    public List<string> Extensions { get; set; } = new List<string>();

    /// <summary>
    /// The mime type
    /// </summary>
    public string? MimeType { get; set; }

    /// <summary>
    /// Key/Value pairs containing findings from the analysis.
    /// </summary>
    public IDictionary<string, string> Metadata { get; private set; } = new Dictionary<string, string>();
}
