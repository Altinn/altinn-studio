using AngleSharp.Html.Dom;

namespace Altinn.Studio.Cli.Upgrade.Next.IndexMigration;

/// <summary>
/// Detects custom JavaScript in Index.cshtml
/// </summary>
internal sealed class CustomJavaScriptDetector
{
    private readonly IHtmlDocument _document;

    // Standard script patterns that should be ignored (part of the standard template)
    private static readonly HashSet<string> StandardScriptPatterns =
    [
        "const appId = window.location.pathname.split('/')",
        "window.org = appId[1]",
        "window.app = appId[2]",
    ];

    public CustomJavaScriptDetector(IHtmlDocument document)
    {
        _document = document;
    }

    /// <summary>
    /// Detects custom JavaScript (inline scripts and external scripts)
    /// </summary>
    /// <returns>Detection result with inline and external scripts</returns>
    public CustomJavaScriptResult Detect()
    {
        var inlineScripts = new List<string>();
        var externalScripts = new List<string>();

        // Find all <script> tags
        var scriptTags = _document.QuerySelectorAll("script");

        foreach (var scriptTag in scriptTags)
        {
            var src = scriptTag.GetAttribute("src");
            var content = scriptTag.TextContent?.Trim();

            // External script
            if (!string.IsNullOrWhiteSpace(src))
            {
                // Skip standard altinn-app-frontend.js
                if (!src.Contains("altinn-app-frontend.js"))
                {
                    externalScripts.Add(src);
                }
            }
            // Inline script
            else if (!string.IsNullOrWhiteSpace(content))
            {
                // Skip standard initialization script
                if (!IsStandardScript(content))
                {
                    inlineScripts.Add(content);
                }
            }
        }

        return new CustomJavaScriptResult { InlineScripts = inlineScripts, ExternalScripts = externalScripts };
    }

    private static bool IsStandardScript(string content)
    {
        // Check if the script contains any of the standard patterns
        return StandardScriptPatterns.Any(pattern => content.Contains(pattern, StringComparison.OrdinalIgnoreCase));
    }
}
