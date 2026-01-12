using AngleSharp.Html.Dom;

namespace Altinn.Studio.Cli.Upgrade.Next.IndexMigration;

/// <summary>
/// Detects custom CSS in Index.cshtml
/// </summary>
internal sealed class CustomCssDetector
{
    private readonly IHtmlDocument _document;

    public CustomCssDetector(IHtmlDocument document)
    {
        _document = document;
    }

    /// <summary>
    /// Detects custom CSS (inline styles and external stylesheets)
    /// </summary>
    /// <returns>Detection result with inline and external CSS</returns>
    public CustomCssResult Detect()
    {
        var inlineStyles = DetectInlineStyles();
        var externalStylesheets = DetectExternalStylesheets();

        return new CustomCssResult { InlineStyles = inlineStyles, ExternalStylesheets = externalStylesheets };
    }

    private List<string> DetectInlineStyles()
    {
        var inlineStyles = new List<string>();

        // Find all <style> tags
        var styleTags = _document.QuerySelectorAll("style");

        foreach (var styleTag in styleTags)
        {
            var content = styleTag.TextContent?.Trim();
            if (!string.IsNullOrWhiteSpace(content))
            {
                inlineStyles.Add(content);
            }
        }

        return inlineStyles;
    }

    private List<string> DetectExternalStylesheets()
    {
        var externalStylesheets = new List<string>();

        // Find all <link rel="stylesheet"> tags
        var linkTags = _document.QuerySelectorAll("link[rel='stylesheet']");

        foreach (var linkTag in linkTags)
        {
            var href = linkTag.GetAttribute("href");

            // Skip standard altinn-app-frontend.css
            if (!string.IsNullOrWhiteSpace(href) && !href.Contains("altinn-app-frontend.css"))
            {
                externalStylesheets.Add(href);
            }
        }

        return externalStylesheets;
    }
}
