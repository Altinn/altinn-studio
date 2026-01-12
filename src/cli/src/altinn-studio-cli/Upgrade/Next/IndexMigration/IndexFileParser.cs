using AngleSharp;
using AngleSharp.Html.Dom;
using AngleSharp.Html.Parser;

namespace Altinn.Studio.Cli.Upgrade.Next.IndexMigration;

/// <summary>
/// Parses Index.cshtml files using AngleSharp HTML parser
/// </summary>
internal sealed class IndexFileParser
{
    private readonly string _filePath;
    private IHtmlDocument? _document;
    private readonly List<string> _parseWarnings = [];

    public IndexFileParser(string filePath)
    {
        _filePath = filePath;
    }

    /// <summary>
    /// Parses the Index.cshtml file
    /// </summary>
    /// <returns>True if parsing was successful, false otherwise</returns>
    public async Task Parse()
    {
        if (!File.Exists(_filePath))
        {
            _parseWarnings.Add($"File not found: {_filePath}");
            return;
        }

        var htmlContent = await File.ReadAllTextAsync(_filePath);

        // AngleSharp is tolerant of Razor syntax in text nodes and attribute values
        // We parse directly without preprocessing since we're only detecting structural elements
        var parser = new HtmlParser();
        _document = await parser.ParseDocumentAsync(htmlContent);
    }

    /// <summary>
    /// Gets the parsed HTML document
    /// </summary>
    /// <returns>The parsed document, or null if parsing failed</returns>
    public IHtmlDocument? GetDocument() => _document;

    /// <summary>
    /// Gets any warnings generated during parsing
    /// </summary>
    /// <returns>List of parse warnings</returns>
    public List<string> GetParseWarnings() => _parseWarnings;
}
