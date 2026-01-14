using System.Text.RegularExpressions;
using AngleSharp.Dom;

namespace Altinn.Studio.Cli.Upgrade.Next.IndexMigration;

/// <summary>
/// Matches standard framework elements that are expected in Index.cshtml
/// </summary>
internal sealed class StandardElementMatcher
{
    /// <summary>
    /// Checks if an element is a standard framework element
    /// </summary>
    /// <param name="element">The element to check</param>
    /// <param name="description">Output: Description of what this element is (if matched)</param>
    /// <returns>True if this is a standard framework element</returns>
    public bool IsStandardElement(IElement element, out string description)
    {
        description = string.Empty;

        var tagName = element.TagName.ToLowerInvariant();

        return tagName switch
        {
            "html" => IsHtmlElement(element, out description),
            "head" => IsHeadElement(element, out description),
            "meta" => IsStandardMetaTag(element, out description),
            "title" => IsTitleElement(element, out description),
            "link" => IsStandardLinkElement(element, out description),
            "body" => IsBodyElement(element, out description),
            "div" => IsRootDiv(element, out description),
            "script" => IsStandardScript(element, out description),
            "style" => IsStandardStyle(element, out description),
            _ => false,
        };
    }

    private static bool IsHtmlElement(IElement element, out string description)
    {
        description = "HTML root element";
        return true;
    }

    private static bool IsHeadElement(IElement element, out string description)
    {
        description = "HTML head element";
        return true;
    }

    private static bool IsBodyElement(IElement element, out string description)
    {
        description = "HTML body element";
        return true;
    }

    private static bool IsStandardMetaTag(IElement element, out string description)
    {
        description = string.Empty;

        var charset = element.GetAttribute("charset");
        if (!string.IsNullOrWhiteSpace(charset))
        {
            description = "Charset meta tag";
            return true;
        }

        var name = element.GetAttribute("name");
        var httpEquiv = element.GetAttribute("http-equiv");

        if (name?.Equals("viewport", StringComparison.OrdinalIgnoreCase) == true)
        {
            description = "Viewport meta tag";
            return true;
        }

        if (httpEquiv?.Equals("X-UA-Compatible", StringComparison.OrdinalIgnoreCase) == true)
        {
            description = "X-UA-Compatible meta tag";
            return true;
        }

        return false;
    }

    private static bool IsTitleElement(IElement element, out string description)
    {
        // Title element with any content (including Razor syntax like @ViewBag.Org)
        description = "Page title element";
        return true;
    }

    private static bool IsStandardLinkElement(IElement element, out string description)
    {
        description = string.Empty;

        var rel = element.GetAttribute("rel");
        var href = element.GetAttribute("href");

        if (string.IsNullOrWhiteSpace(href))
        {
            return false;
        }

        // Favicon link
        if (
            rel?.Equals("icon", StringComparison.OrdinalIgnoreCase) == true
            || href.Contains("favicon", StringComparison.OrdinalIgnoreCase)
        )
        {
            description = "Favicon link";
            return true;
        }

        // Framework CSS
        if (
            rel?.Equals("stylesheet", StringComparison.OrdinalIgnoreCase) == true
            && href.Contains("altinn-app-frontend", StringComparison.OrdinalIgnoreCase)
            && href.EndsWith(".css", StringComparison.OrdinalIgnoreCase)
        )
        {
            description = "Altinn app frontend CSS";
            return true;
        }

        return false;
    }

    private static bool IsRootDiv(IElement element, out string description)
    {
        description = string.Empty;

        var id = element.GetAttribute("id");
        if (id?.Equals("root", StringComparison.OrdinalIgnoreCase) == true)
        {
            description = "React root div";
            return true;
        }

        // Old template wrapper div with flex classes
        var className = element.GetAttribute("class") ?? string.Empty;
        if (IsOldTemplateWrapperDiv(className, element))
        {
            description = "Old template wrapper div";
            return true;
        }

        return false;
    }

    /// <summary>
    /// Checks if element is the old template wrapper div with flex-column d-flex media-body classes
    /// </summary>
    private static bool IsOldTemplateWrapperDiv(string className, IElement element)
    {
        // The old template has a wrapper div with these classes
        var hasFlexColumn = className.Contains("flex-column", StringComparison.OrdinalIgnoreCase);
        var hasDFlex = className.Contains("d-flex", StringComparison.OrdinalIgnoreCase);
        var hasMediaBody = className.Contains("media-body", StringComparison.OrdinalIgnoreCase);

        if (!hasFlexColumn || !hasDFlex || !hasMediaBody)
        {
            return false;
        }

        // Verify this is the wrapper div by checking it's a direct child of body
        // or contains the root div as a descendant
        var parent = element.ParentElement;
        if (parent?.TagName.Equals("body", StringComparison.OrdinalIgnoreCase) == true)
        {
            return true;
        }

        // Also accept if it contains a root div descendant
        var rootDiv = element.QuerySelector("#root");
        if (rootDiv != null)
        {
            return true;
        }

        return false;
    }

    private static bool IsStandardScript(IElement element, out string description)
    {
        description = string.Empty;

        var src = element.GetAttribute("src");

        // External framework script
        if (!string.IsNullOrWhiteSpace(src))
        {
            if (
                src.Contains("altinn-app-frontend", StringComparison.OrdinalIgnoreCase)
                && src.EndsWith(".js", StringComparison.OrdinalIgnoreCase)
            )
            {
                description = "Altinn app frontend JS";
                return true;
            }

            return false;
        }

        // Inline script - check if it's the standard app ID initialization
        var content = element.TextContent?.Trim();
        if (string.IsNullOrWhiteSpace(content))
        {
            return false;
        }

        if (ContainsAppIdInitialization(content))
        {
            description = "Standard app ID initialization script";
            return true;
        }

        // Check for loadScript() function call (used in old template)
        if (IsLoadScriptCall(content))
        {
            description = "Old template loadScript() call";
            return true;
        }

        return false;
    }

    /// <summary>
    /// Checks if script content is just a call to loadScript() (old template pattern)
    /// </summary>
    private static bool IsLoadScriptCall(string content)
    {
        // Normalize and check if it's just a loadScript() call
        var normalized = Regex.Replace(content, @"\s+", "").Trim();

        // Match loadScript(); or loadScript()
        return normalized.Equals("loadScript();", StringComparison.OrdinalIgnoreCase)
            || normalized.Equals("loadScript()", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsStandardStyle(IElement element, out string description)
    {
        description = string.Empty;

        var content = element.TextContent?.Trim();
        if (string.IsNullOrWhiteSpace(content))
        {
            return false;
        }

        // Check for HashRouterRedirect class (used in some template versions)
        if (content.Contains("HashRouterRedirect", StringComparison.OrdinalIgnoreCase))
        {
            description = "HashRouterRedirect style";
            return true;
        }

        // Check for old template height: 100% style on html/body
        if (IsOldTemplateHeightStyle(content))
        {
            description = "Old template height style";
            return true;
        }

        return false;
    }

    /// <summary>
    /// Checks if style content is the old template's html, body { height: 100%; } pattern
    /// </summary>
    private static bool IsOldTemplateHeightStyle(string content)
    {
        // Normalize whitespace for comparison
        var normalized = Regex.Replace(content, @"\s+", " ").Trim().ToLowerInvariant();

        // Match patterns like "html, body { height: 100%; }" with flexible whitespace
        // The pattern should only contain html/body selectors and height property
        if (!normalized.Contains("height"))
        {
            return false;
        }

        // Check it's targeting html and/or body
        var hasHtml = normalized.Contains("html");
        var hasBody = normalized.Contains("body");

        if (!hasHtml && !hasBody)
        {
            return false;
        }

        // Make sure it's a simple style (only height-related properties)
        // Remove the selectors and braces to check properties
        var propertiesMatch = Regex.Match(normalized, @"\{([^}]+)\}");
        if (!propertiesMatch.Success)
        {
            return false;
        }

        var properties = propertiesMatch.Groups[1].Value.Trim();

        // Should only contain height property (with possible 100% or similar value)
        // Allow for height: 100%; or height:100% patterns
        var heightPattern = @"^\s*height\s*:\s*100\s*%?\s*;?\s*$";
        if (Regex.IsMatch(properties, heightPattern))
        {
            return true;
        }

        return false;
    }

    /// <summary>
    /// Checks if script content contains the standard app ID initialization patterns
    /// </summary>
    private static bool ContainsAppIdInitialization(string scriptContent)
    {
        // Normalize the script content for comparison
        var normalized = NormalizeScript(scriptContent);

        // Standard patterns that indicate app ID initialization
        var patterns = new[] { "window.location.pathname.split", "window.org", "window.app" };

        // If script contains at least 2 of these patterns, it's likely the standard initialization
        var matchCount = patterns.Count(pattern => normalized.Contains(pattern, StringComparison.OrdinalIgnoreCase));

        return matchCount >= 2;
    }

    /// <summary>
    /// Normalizes script content by removing whitespace and standardizing format
    /// </summary>
    private static string NormalizeScript(string script)
    {
        if (string.IsNullOrWhiteSpace(script))
        {
            return string.Empty;
        }

        // Remove extra whitespace, collapse to single spaces
        var normalized = Regex.Replace(script, @"\s+", " ");

        // Trim
        normalized = normalized.Trim();

        return normalized;
    }
}
