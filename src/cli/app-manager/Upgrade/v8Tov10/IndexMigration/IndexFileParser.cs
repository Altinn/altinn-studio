using System.Text.RegularExpressions;
using AngleSharp.Html.Dom;
using AngleSharp.Html.Parser;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.IndexMigration;

/// <summary>
/// Parses Index.cshtml files using AngleSharp HTML parser
/// </summary>
internal sealed partial class IndexFileParser
{
    private readonly string _filePath;
    private IHtmlDocument? _document;
    private string _rawContent = string.Empty;

    public IndexFileParser(string filePath)
    {
        _filePath = filePath;
    }

    /// <summary>
    /// Detected Razor directives that block migration
    /// </summary>
    public List<string> DetectedRazorDirectives { get; } = [];

    /// <summary>
    /// Whether Razor directives that block migration were detected
    /// </summary>
    public bool HasRazorDirectives => DetectedRazorDirectives.Count > 0;

    /// <summary>
    /// Parses the Index.cshtml file
    /// </summary>
    public async Task Parse()
    {
        _rawContent = await File.ReadAllTextAsync(_filePath);

        // Detect Razor control flow directives BEFORE parsing with AngleSharp
        // These are invisible to the HTML parser but represent logic we can't migrate
        DetectRazorControlFlow();

        // Remove Razor comments (@* ... *@) before parsing
        // These can contain commented-out elements that shouldn't be parsed or migrated
        var preprocessedContent = StripRazorComments(_rawContent);

        // AngleSharp is tolerant of Razor syntax in text nodes and attribute values
        // We parse directly without preprocessing since we're only detecting structural elements
        var parser = new HtmlParser();
        _document = await parser.ParseDocumentAsync(preprocessedContent);
    }

    /// <summary>
    /// Strips Razor comments (@* ... *@) from the content.
    /// These comments can span multiple lines and may contain HTML elements
    /// that should not be parsed or migrated.
    /// </summary>
    private static string StripRazorComments(string content)
    {
        return RazorCommentPattern().Replace(content, string.Empty);
    }

    /// <summary>
    /// Gets the parsed HTML document
    /// </summary>
    /// <returns>The parsed document, or null if parsing failed</returns>
    public IHtmlDocument? GetDocument() => _document;

    private void DetectRazorControlFlow()
    {
        // Detect Razor directives that represent logic we can't migrate to a static config
        // These patterns are checked on the raw file content since AngleSharp treats them as text nodes

        // Control flow directives: @if, @else, @for, @foreach, etc.
        var controlFlowMatches = RazorControlFlowPattern().Matches(_rawContent);
        foreach (Match match in controlFlowMatches)
        {
            var directive = match.Groups["directive"].Value;
            var context = GetMatchContext(match);
            DetectedRazorDirectives.Add($"@{directive} at: {context}");
        }

        // Additional dangerous patterns: @Html., @await, @functions, @section, etc.
        var dangerousMatches = RazorDangerousPattern().Matches(_rawContent);
        foreach (Match match in dangerousMatches)
        {
            var directive = match.Groups["directive"].Value;
            var context = GetMatchContext(match);
            DetectedRazorDirectives.Add($"@{directive} at: {context}");
        }

        // Code blocks: @{ ... }
        var codeBlockMatches = RazorCodeBlockPattern().Matches(_rawContent);
        foreach (Match match in codeBlockMatches)
        {
            var context = GetMatchContext(match);
            DetectedRazorDirectives.Add($"@{{ (code block) at: {context}");
        }
    }

    private string GetMatchContext(Match match)
    {
        // Get surrounding context for error reporting
        var start = Math.Max(0, match.Index - 10);
        var length = Math.Min(50, _rawContent.Length - start);
        var context = _rawContent.Substring(start, length).Replace("\n", " ").Replace("\r", "");
        return context.Trim();
    }

    /// <summary>
    /// Matches Razor control flow directives: @if, @else, @for, @foreach, @while, @switch, @try, @lock, @code
    /// Does NOT match @using (import), @inject, @ViewBag, etc. which are safe/expected
    /// </summary>
    [GeneratedRegex(
        @"@(?<directive>if|else|for|foreach|while|switch|try|catch|finally|lock|code)\b",
        RegexOptions.IgnoreCase
    )]
    private static partial Regex RazorControlFlowPattern();

    /// <summary>
    /// Matches additional dangerous Razor patterns that block migration:
    /// @Html. (HTML helper methods), @await (async expressions), @functions (embedded functions),
    /// @section (named sections), @addTagHelper (tag helper registration),
    /// @inherits (base class directive), @model (model directive)
    /// </summary>
    [GeneratedRegex(
        @"@(?<directive>Html\.|await[\s(]|functions\s*\{|section\s+\w|addTagHelper|inherits\s|model\s)",
        RegexOptions.IgnoreCase
    )]
    private static partial Regex RazorDangerousPattern();

    /// <summary>
    /// Matches Razor code blocks: @{ ... }
    /// </summary>
    [GeneratedRegex(@"@\{")]
    private static partial Regex RazorCodeBlockPattern();

    /// <summary>
    /// Matches Razor comments: @* ... *@
    /// These can span multiple lines and contain any content including HTML elements.
    /// Uses non-greedy matching to handle multiple comments in the same file.
    /// </summary>
    [GeneratedRegex(@"@\*.*?\*@", RegexOptions.Singleline)]
    private static partial Regex RazorCommentPattern();
}
