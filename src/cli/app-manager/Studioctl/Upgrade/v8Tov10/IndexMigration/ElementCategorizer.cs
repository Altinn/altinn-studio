using AngleSharp.Dom;
using AngleSharp.Html.Dom;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.IndexMigration;

/// <summary>
/// Categorizes all elements in Index.cshtml into expected, known customizations, and unexpected
/// </summary>
internal sealed class ElementCategorizer
{
    private readonly StandardElementMatcher _standardMatcher = new();
    private readonly KnownCustomizationMatcher _customizationMatcher = new();

    /// <summary>
    /// Categorizes all elements in the document
    /// </summary>
    /// <param name="document">The parsed HTML document</param>
    /// <returns>Categorization result with all elements classified</returns>
    public CategorizationResult Categorize(IHtmlDocument document)
    {
        var result = new CategorizationResult();

        // Process all elements in the document
        CategorizeRecursive(document.DocumentElement, result);

        return result;
    }

    private void CategorizeRecursive(INode? node, CategorizationResult result)
    {
        if (node == null)
        {
            return;
        }

        if (node is IElement element)
        {
            CategorizeElement(element, result);
        }

        foreach (var child in node.ChildNodes)
        {
            CategorizeRecursive(child, result);
        }
    }

    private void CategorizeElement(IElement element, CategorizationResult result)
    {
        if (_standardMatcher.IsStandardElement(element, out var description))
        {
            result.ExpectedElements.Add(
                new ExpectedElement
                {
                    TagName = element.TagName,
                    OuterHtml = TruncateHtml(element.OuterHtml),
                    Category = ElementCategory.Expected,
                    Description = description,
                }
            );
            return;
        }

        if (_customizationMatcher.IsKnownCustomization(element, out var customization) && customization != null)
        {
            result.KnownCustomizations.Add(customization);
            return;
        }

        result.UnexpectedElements.Add(
            new UnexpectedElement
            {
                TagName = element.TagName,
                OuterHtml = TruncateHtml(element.OuterHtml),
                Category = ElementCategory.Unexpected,
                Reason = "Element does not match any known framework pattern or known customization",
                Location = GetElementLocation(element),
            }
        );
    }

    private static string GetElementLocation(IElement element)
    {
        var parent = element.ParentElement;
        while (parent != null)
        {
            var parentTag = parent.TagName.ToLowerInvariant();
            if (parentTag == "head")
            {
                return "head";
            }
            if (parentTag == "body")
            {
                return "body";
            }
            parent = parent.ParentElement;
        }

        return "unknown";
    }

    private static string TruncateHtml(string html, int maxLength = 200)
    {
        if (string.IsNullOrWhiteSpace(html))
        {
            return string.Empty;
        }

        if (html.Length <= maxLength)
        {
            return html;
        }

        return string.Concat(html.AsSpan(0, maxLength), "...");
    }
}
