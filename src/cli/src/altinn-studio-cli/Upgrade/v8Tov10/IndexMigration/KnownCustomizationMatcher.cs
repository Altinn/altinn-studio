using AngleSharp.Dom;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.IndexMigration;

/// <summary>
/// Matches known customization patterns that can be migrated
/// </summary>
internal sealed class KnownCustomizationMatcher
{
    private readonly StandardElementMatcher _standardMatcher = new();
    private readonly StrictScriptAnalyzer _scriptAnalyzer = new();
    private readonly StrictStyleAnalyzer _styleAnalyzer = new();

    /// <summary>
    /// Checks if an element is a known customization
    /// </summary>
    /// <param name="element">The element to check</param>
    /// <param name="customization">Output: The customization details (if matched)</param>
    /// <returns>True if this is a known customization</returns>
    public bool IsKnownCustomization(IElement element, out KnownCustomization? customization)
    {
        customization = null;

        var tagName = element.TagName.ToLowerInvariant();

        return tagName switch
        {
            "link" => IsCustomStylesheet(element, out customization),
            "script" => IsCustomScript(element, out customization),
            "style" => IsCustomInlineStyle(element, out customization),
            _ => false,
        };
    }

    private bool IsCustomStylesheet(IElement element, out KnownCustomization? customization)
    {
        customization = null;

        var rel = element.GetAttribute("rel");
        var href = element.GetAttribute("href");

        if (rel?.Equals("stylesheet", StringComparison.OrdinalIgnoreCase) != true || string.IsNullOrWhiteSpace(href))
        {
            return false;
        }

        if (_standardMatcher.IsStandardElement(element, out _))
        {
            return false;
        }

        var asset = ExtractStylesheetAsset(element, href);

        customization = new KnownCustomization
        {
            TagName = element.TagName,
            OuterHtml = element.OuterHtml,
            Category = ElementCategory.KnownCustomization,
            CustomizationType = CustomizationType.ExternalStylesheet,
            ExtractionHint = href,
            Description = $"External stylesheet: {href}",
            Asset = asset,
        };

        return true;
    }

    private bool IsCustomScript(IElement element, out KnownCustomization? customization)
    {
        customization = null;

        var src = element.GetAttribute("src");

        if (!string.IsNullOrWhiteSpace(src))
        {
            if (_standardMatcher.IsStandardElement(element, out _))
            {
                return false;
            }

            var asset = ExtractScriptAsset(element, src);

            customization = new KnownCustomization
            {
                TagName = element.TagName,
                OuterHtml = element.OuterHtml,
                Category = ElementCategory.KnownCustomization,
                CustomizationType = CustomizationType.ExternalScript,
                ExtractionHint = src,
                Description = $"External script: {src}",
                Asset = asset,
            };

            return true;
        }

        var content = element.TextContent?.Trim();
        if (string.IsNullOrWhiteSpace(content))
        {
            return false;
        }

        var analysis = _scriptAnalyzer.Analyze(content);
        if (analysis.IsStandard)
        {
            return false;
        }

        var extractionContent = analysis.CleanedContent ?? content;

        if (string.IsNullOrWhiteSpace(extractionContent))
        {
            return false;
        }

        customization = new KnownCustomization
        {
            TagName = element.TagName,
            OuterHtml = element.OuterHtml,
            Category = ElementCategory.KnownCustomization,
            CustomizationType = CustomizationType.InlineScript,
            ExtractionHint = extractionContent,
            Description = $"Inline script ({extractionContent.Length} characters, boilerplate stripped)",
            Asset = null,
        };

        return true;
    }

    private bool IsCustomInlineStyle(IElement element, out KnownCustomization? customization)
    {
        customization = null;

        var content = element.TextContent?.Trim();
        if (string.IsNullOrWhiteSpace(content))
        {
            return false;
        }

        var analysis = _styleAnalyzer.Analyze(content);
        if (analysis.IsStandard)
        {
            return false;
        }

        var extractionContent = analysis.CleanedContent ?? content;

        if (string.IsNullOrWhiteSpace(extractionContent))
        {
            return false;
        }

        customization = new KnownCustomization
        {
            TagName = element.TagName,
            OuterHtml = element.OuterHtml,
            Category = ElementCategory.KnownCustomization,
            CustomizationType = CustomizationType.InlineStylesheet,
            ExtractionHint = extractionContent,
            Description = $"Inline style ({extractionContent.Length} characters, boilerplate stripped)",
            Asset = null,
        };

        return true;
    }

    /// <summary>
    /// Extracts script attributes into a BrowserScript
    /// </summary>
    private static BrowserScript ExtractScriptAsset(IElement element, string src)
    {
        var type = element.GetAttribute("type");
        var scriptType =
            type?.Equals("module", StringComparison.OrdinalIgnoreCase) == true
                ? BrowserScriptType.Module
                : (BrowserScriptType?)null;

        return new BrowserScript
        {
            Url = src,
            Type = scriptType,
            Async = element.HasAttribute("async"),
            Defer = element.HasAttribute("defer"),
            Nomodule = element.HasAttribute("nomodule"),
            Crossorigin = element.HasAttribute("crossorigin"),
            Integrity = element.GetAttribute("integrity"),
        };
    }

    /// <summary>
    /// Extracts stylesheet attributes into a BrowserStylesheet
    /// </summary>
    private static BrowserStylesheet ExtractStylesheetAsset(IElement element, string href)
    {
        return new BrowserStylesheet
        {
            Url = href,
            Crossorigin = element.HasAttribute("crossorigin"),
            Integrity = element.GetAttribute("integrity"),
            Media = element.GetAttribute("media"),
        };
    }
}
