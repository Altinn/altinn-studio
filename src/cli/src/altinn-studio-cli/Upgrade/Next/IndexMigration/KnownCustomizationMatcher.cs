using AngleSharp.Dom;

namespace Altinn.Studio.Cli.Upgrade.Next.IndexMigration;

/// <summary>
/// Matches known customization patterns that can be migrated
/// </summary>
internal sealed class KnownCustomizationMatcher
{
    private readonly StandardElementMatcher _standardMatcher = new();

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

        // Must be a stylesheet link with href
        if (!rel?.Equals("stylesheet", StringComparison.OrdinalIgnoreCase) == true || string.IsNullOrWhiteSpace(href))
        {
            return false;
        }

        // Check if it's a standard element (framework CSS)
        if (_standardMatcher.IsStandardElement(element, out _))
        {
            return false;
        }

        // It's a custom external stylesheet - capture all attributes
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

        // External script
        if (!string.IsNullOrWhiteSpace(src))
        {
            // Check if it's a standard element (framework JS)
            if (_standardMatcher.IsStandardElement(element, out _))
            {
                return false;
            }

            // It's a custom external script - capture all attributes
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

        // Inline script
        var content = element.TextContent?.Trim();
        if (string.IsNullOrWhiteSpace(content))
        {
            return false;
        }

        // Check if it's a standard element (app ID initialization)
        if (_standardMatcher.IsStandardElement(element, out _))
        {
            return false;
        }

        // It's a custom inline script (no asset, will be extracted to separate file)
        customization = new KnownCustomization
        {
            TagName = element.TagName,
            OuterHtml = element.OuterHtml,
            Category = ElementCategory.KnownCustomization,
            CustomizationType = CustomizationType.InlineScript,
            ExtractionHint = content,
            Description = $"Inline script ({content.Length} characters)",
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

        // Check if it's a standard element
        if (_standardMatcher.IsStandardElement(element, out _))
        {
            return false;
        }

        // It's a custom inline style (no asset, will be extracted to separate file)
        customization = new KnownCustomization
        {
            TagName = element.TagName,
            OuterHtml = element.OuterHtml,
            Category = ElementCategory.KnownCustomization,
            CustomizationType = CustomizationType.InlineStylesheet,
            ExtractionHint = content,
            Description = $"Inline style ({content.Length} characters)",
            Asset = null,
        };

        return true;
    }

    /// <summary>
    /// Extracts script attributes into a FrontendAsset
    /// </summary>
    private static FrontendAsset ExtractScriptAsset(IElement element, string src)
    {
        return new FrontendAsset
        {
            Url = src,
            Type = element.GetAttribute("type"),
            Async = element.HasAttribute("async") ? true : null,
            Defer = element.HasAttribute("defer") ? true : null,
            Nomodule = element.HasAttribute("nomodule") ? true : null,
            Crossorigin = element.GetAttribute("crossorigin"),
            Integrity = element.GetAttribute("integrity"),
        };
    }

    /// <summary>
    /// Extracts stylesheet attributes into a FrontendAsset
    /// </summary>
    private static FrontendAsset ExtractStylesheetAsset(IElement element, string href)
    {
        return new FrontendAsset
        {
            Url = href,
            Crossorigin = element.GetAttribute("crossorigin"),
            Integrity = element.GetAttribute("integrity"),
            Media = element.GetAttribute("media"),
        };
    }
}
