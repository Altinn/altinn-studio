using AngleSharp.Dom;
using AngleSharp.Html.Dom;

namespace Altinn.Studio.Cli.Upgrade.Next.IndexMigration;

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

        // Process the current node if it's an element
        if (node is IElement element)
        {
            CategorizeElement(element, result);
        }

        // Process all child nodes recursively
        foreach (var child in node.ChildNodes)
        {
            CategorizeRecursive(child, result);
        }
    }

    private void CategorizeElement(IElement element, CategorizationResult result)
    {
        // Skip ignorable nodes
        if (IsIgnorableNode(element))
        {
            return;
        }

        // Check if it's a standard framework element
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

        // Check if it's a known customization
        if (_customizationMatcher.IsKnownCustomization(element, out var customization))
        {
            if (customization != null)
            {
                result.KnownCustomizations.Add(customization);
                return;
            }
        }

        // If we get here, it's unexpected
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

    private static bool IsIgnorableNode(IElement element)
    {
        var tagName = element.TagName.ToLowerInvariant();

        // Text nodes and comments are handled by AngleSharp separately
        // We only ignore specific element types that are just containers

        // Don't ignore any elements - we want to categorize everything
        return false;
    }

    private static string GetElementLocation(IElement element)
    {
        // Determine if element is in head or body
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

        return html.Substring(0, maxLength) + "...";
    }
}
