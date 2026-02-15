using System.Text.RegularExpressions;
using AngleSharp.Dom;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.IndexMigration;

/// <summary>
/// Matches standard framework elements that are expected in Index.cshtml.
/// Uses strict whitelist matching - only exact known patterns are recognized.
/// </summary>
internal sealed partial class StandardElementMatcher
{
    private readonly StrictScriptAnalyzer _scriptAnalyzer = new();

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
            "html" => IsStandardHtmlElement(element, out description),
            "head" => SetDescription(out description, "HTML head element"),
            "meta" => IsStandardMetaTag(element, out description),
            "title" => IsStandardTitleElement(element, out description),
            "link" => IsStandardLinkElement(element, out description),
            "body" => SetDescription(out description, "HTML body element"),
            "div" => IsStandardDiv(element, out description),
            "script" => IsStandardScript(element, out description),
            "style" => IsStandardStyle(element, out description),
            _ => false,
        };
    }

    private static bool SetDescription(out string description, string value)
    {
        description = value;
        return true;
    }

    private static bool IsStandardHtmlElement(IElement element, out string description)
    {
        description = string.Empty;

        // html element should have lang attribute (typically "no" or "nb" or "en")
        var attrs = GetAttributes(element);

        // Allow: lang only, or lang + class (some templates add class)
        if (attrs.TryGetValue("lang", out var lang) && !string.IsNullOrEmpty(lang))
        {
            // Check for unexpected attributes beyond lang and class
            var allowedAttrs = new HashSet<string> { "lang", "class" };
            if (attrs.Keys.All(k => allowedAttrs.Contains(k)))
            {
                description = "HTML root element";
                return true;
            }
        }

        return false;
    }

    private static bool IsStandardTitleElement(IElement element, out string description)
    {
        description = string.Empty;

        // Title should contain @ViewBag.Org and @ViewBag.App pattern or be simple text
        var content = element.TextContent?.Trim();

        // Standard templates have: "@ViewBag.Org- @ViewBag.App" or similar
        // After rendering it becomes: "org- app" or similar
        // Accept any title content as standard (title is not customized)
        if (!string.IsNullOrEmpty(content))
        {
            description = "Page title element";
            return true;
        }

        return false;
    }

    private static bool IsStandardMetaTag(IElement element, out string description)
    {
        description = string.Empty;
        var attrs = GetAttributes(element);

        // STRICT: charset meta - must be ONLY charset="utf-8"
        if (attrs.TryGetValue("charset", out var charset))
        {
            if (attrs.Count == 1 && charset.Equals("utf-8", StringComparison.OrdinalIgnoreCase))
            {
                description = "Charset meta tag";
                return true;
            }
            return false;
        }

        // STRICT: viewport meta - must have exactly name="viewport" and content with exact value
        if (attrs.TryGetValue("name", out var name) && name.Equals("viewport", StringComparison.OrdinalIgnoreCase))
        {
            if (attrs.Count == 2 && attrs.TryGetValue("content", out var content))
            {
                var normalizedContent = Regex.Replace(content, @"\s+", "");
                if (normalizedContent == "width=device-width,initial-scale=1,shrink-to-fit=no")
                {
                    description = "Viewport meta tag";
                    return true;
                }
            }
            return false;
        }

        // STRICT: X-UA-Compatible meta - must have exactly http-equiv and content
        if (
            attrs.TryGetValue("http-equiv", out var httpEquiv)
            && httpEquiv.Equals("X-UA-Compatible", StringComparison.OrdinalIgnoreCase)
        )
        {
            if (
                attrs.Count == 2
                && attrs.TryGetValue("content", out var content)
                && content.Equals("IE=edge", StringComparison.OrdinalIgnoreCase)
            )
            {
                description = "X-UA-Compatible meta tag";
                return true;
            }
            return false;
        }

        return false;
    }

    private static bool IsStandardLinkElement(IElement element, out string description)
    {
        description = string.Empty;
        var attrs = GetAttributes(element);

        var rel = attrs.GetValueOrDefault("rel");
        var href = attrs.GetValueOrDefault("href");

        if (string.IsNullOrWhiteSpace(href))
        {
            return false;
        }

        // STRICT: Favicon link - rel="icon" and href contains "favicon"
        if (rel?.Equals("icon", StringComparison.OrdinalIgnoreCase) == true)
        {
            if (href.Contains("favicon", StringComparison.OrdinalIgnoreCase))
            {
                description = "Favicon link";
                return true;
            }
            return false;
        }

        // STRICT: Framework CSS - must match altinncdn.no/.../altinn-app-frontend.css pattern
        if (rel?.Equals("stylesheet", StringComparison.OrdinalIgnoreCase) == true)
        {
            if (FrameworkCssPattern().IsMatch(href))
            {
                description = "Altinn app frontend CSS";
                return true;
            }

            // Localhost framework CSS - used during local development, should not be migrated
            if (LocalhostFrameworkCssPattern().IsMatch(href))
            {
                description = "Localhost Altinn app frontend CSS (local development)";
                return true;
            }

            // Altinn DIN font CSS - managed by the generated HTML, should not be carried over
            if (AltinnDinFontCssPattern().IsMatch(href))
            {
                description = "Altinn DIN font CSS (managed by generated HTML)";
                return true;
            }

            // Fortawesome toolkit CSS - deprecated, should not be migrated
            if (FortawesomeToolkitCssPattern().IsMatch(href))
            {
                description = "Deprecated Fortawesome toolkit CSS (should not be migrated)";
                return true;
            }

            return false;
        }

        return false;
    }

    private bool IsStandardScript(IElement element, out string description)
    {
        description = string.Empty;

        var src = element.GetAttribute("src");

        if (!string.IsNullOrWhiteSpace(src))
        {
            if (FrameworkJsPattern().IsMatch(src))
            {
                description = "Altinn app frontend JS";
                return true;
            }

            // Localhost framework JS - used during local development, should not be migrated
            if (LocalhostFrameworkJsPattern().IsMatch(src))
            {
                description = "Localhost Altinn app frontend JS (local development)";
                return true;
            }

            return false;
        }

        var content = element.TextContent?.Trim();
        if (string.IsNullOrWhiteSpace(content))
        {
            return false;
        }

        var analysis = _scriptAnalyzer.Analyze(content);
        if (analysis.IsStandard)
        {
            description = analysis.Description;
            return true;
        }

        return false;
    }

    private static bool IsStandardStyle(IElement element, out string description)
    {
        description = string.Empty;

        var content = element.TextContent?.Trim();
        if (string.IsNullOrWhiteSpace(content))
        {
            return false;
        }

        // STRICT: Only exact match for html, body { height: 100%; }
        if (IsExactHeightStyle(content))
        {
            description = "Standard height style (html, body { height: 100%; })";
            return true;
        }

        return false;
    }

    private static bool IsExactHeightStyle(string content)
    {
        // Normalize: remove all whitespace, lowercase
        var normalized = Regex.Replace(content, @"\s+", "").ToLowerInvariant();

        // Accept only these exact normalized forms
        var exactPatterns = new[]
        {
            "html,body{height:100%;}",
            "html,body{height:100%}",
            "body,html{height:100%;}",
            "body,html{height:100%}",
        };

        return exactPatterns.Contains(normalized);
    }

    private static bool IsStandardDiv(IElement element, out string description)
    {
        description = string.Empty;

        var id = element.GetAttribute("id");
        var className = element.GetAttribute("class") ?? string.Empty;
        var normalizedClass = NormalizeClassName(className);

        // STRICT: Root div - id="root" with specific allowed class combinations
        if (id?.Equals("root", StringComparison.OrdinalIgnoreCase) == true)
        {
            var allowedClasses = new[]
            {
                "", // no class
                "d-flex flex-column media-body", // old template pattern
            };

            if (allowedClasses.Contains(normalizedClass))
            {
                description = "React root div";
                return true;
            }
            return false;
        }

        // STRICT: Wrapper div - exact class combination, direct child of body
        if (string.IsNullOrEmpty(id) && normalizedClass == "d-flex flex-column media-body")
        {
            var parent = element.ParentElement;
            if (parent?.TagName.Equals("body", StringComparison.OrdinalIgnoreCase) == true)
            {
                description = "Old template wrapper div";
                return true;
            }
            return false;
        }

        // STRICT: Plain wrapper div containing root (no id, no class)
        if (string.IsNullOrEmpty(id) && string.IsNullOrEmpty(className))
        {
            var rootChild = element.QuerySelector("#root");
            if (rootChild != null)
            {
                description = "Wrapper div containing root";
                return true;
            }
        }

        return false;
    }

    private static string NormalizeClassName(string className)
    {
        if (string.IsNullOrWhiteSpace(className))
            return "";

        var classes = className
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(c => c.Trim().ToLowerInvariant())
            .OrderBy(c => c)
            .ToArray();

        return string.Join(" ", classes);
    }

    private static Dictionary<string, string> GetAttributes(IElement element)
    {
        return element.Attributes.ToDictionary(a => a.Name.ToLowerInvariant(), a => a.Value);
    }

    /// <summary>
    /// Matches: https://altinncdn.no/toolkits/altinn-app-frontend/{version}/altinn-app-frontend.js
    /// Version can be: 4, 4.23.5, 4.23.1-pr.xxx, [[frontendVersion]], etc.
    /// </summary>
    [GeneratedRegex(
        @"^https://altinncdn\.no/toolkits/altinn-app-frontend/[^/]+/altinn-app-frontend\.js$",
        RegexOptions.IgnoreCase
    )]
    private static partial Regex FrameworkJsPattern();

    /// <summary>
    /// Matches: https://altinncdn.no/toolkits/altinn-app-frontend/{version}/altinn-app-frontend.css
    /// </summary>
    [GeneratedRegex(
        @"^https://altinncdn\.no/toolkits/altinn-app-frontend/[^/]+/altinn-app-frontend\.css$",
        RegexOptions.IgnoreCase
    )]
    private static partial Regex FrameworkCssPattern();

    /// <summary>
    /// Matches: https://altinncdn.no/fonts/altinn-din/altinn-din.css
    /// This font is managed by the generated HTML and should not be migrated to assets.json.
    /// </summary>
    [GeneratedRegex(@"^https://altinncdn\.no/fonts/altinn-din/altinn-din\.css$", RegexOptions.IgnoreCase)]
    private static partial Regex AltinnDinFontCssPattern();

    /// <summary>
    /// Matches: https://altinncdn.no/toolkits/fortawesome/...
    /// These deprecated Fortawesome toolkit fonts should not be migrated to assets.json.
    /// </summary>
    [GeneratedRegex(@"^https://altinncdn\.no/toolkits/fortawesome/", RegexOptions.IgnoreCase)]
    private static partial Regex FortawesomeToolkitCssPattern();

    /// <summary>
    /// Matches localhost URLs loading altinn-app-frontend.js (any port).
    /// These are used during local development and should not be migrated.
    /// </summary>
    [GeneratedRegex(@"^https?://localhost(:\d+)?/altinn-app-frontend\.js$", RegexOptions.IgnoreCase)]
    private static partial Regex LocalhostFrameworkJsPattern();

    /// <summary>
    /// Matches localhost URLs loading altinn-app-frontend.css (any port).
    /// These are used during local development and should not be migrated.
    /// </summary>
    [GeneratedRegex(@"^https?://localhost(:\d+)?/altinn-app-frontend\.css$", RegexOptions.IgnoreCase)]
    private static partial Regex LocalhostFrameworkCssPattern();
}
