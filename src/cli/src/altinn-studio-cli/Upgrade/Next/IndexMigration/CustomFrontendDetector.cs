using AngleSharp.Html.Dom;

namespace Altinn.Studio.Cli.Upgrade.Next.IndexMigration;

/// <summary>
/// Detects custom frontend apps in Index.cshtml
/// </summary>
internal sealed class CustomFrontendDetector
{
    private readonly IHtmlDocument _document;

    public CustomFrontendDetector(IHtmlDocument document)
    {
        _document = document;
    }

    /// <summary>
    /// Detects whether this is a custom frontend (absence of standard app-frontend scripts)
    /// </summary>
    /// <returns>Detection result with custom frontend flag</returns>
    public CustomFrontendResult Detect()
    {
        // Check if the standard altinn-app-frontend.js script is present
        var scriptTags = _document.QuerySelectorAll("script");

        var hasStandardFrontend = scriptTags.Any(scriptTag =>
        {
            var src = scriptTag.GetAttribute("src");
            return !string.IsNullOrWhiteSpace(src) && src.Contains("altinn-app-frontend.js");
        });

        return new CustomFrontendResult { IsCustomFrontend = !hasStandardFrontend };
    }
}
