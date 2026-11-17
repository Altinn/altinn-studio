using System.Xml;

namespace Altinn.App.Core.Features.Validation.Default;

/// <summary>
/// Builds an XPath-like location for an <see cref="XmlNode"/>, used to point out which field failed XSD validation.
/// </summary>
internal static class XmlNodePath
{
    /// <summary>
    /// Build an XPath-like location (e.g. <c>/Skjema/melding/gruppe[2]/felt</c> or <c>/Skjema/melding/@attr</c>)
    /// for the given node. Positional predicates are only added for elements that have siblings with the same
    /// name, so that rows in repeating groups can be told apart.
    /// </summary>
    /// <returns>The path, or <c>null</c> when the node is missing or is not part of an element tree.</returns>
    public static string? Get(XmlNode? node)
    {
        var segments = new List<string>();
        while (node is not null && node.NodeType != XmlNodeType.Document)
        {
            switch (node)
            {
                case XmlAttribute attribute:
                    segments.Add($"@{attribute.Name}");
                    node = attribute.OwnerElement;
                    break;
                case XmlElement element:
                    segments.Add(GetElementSegment(element));
                    node = element.ParentNode;
                    break;
                default:
                    node = node.ParentNode;
                    break;
            }
        }

        if (segments.Count == 0)
        {
            return null;
        }

        segments.Reverse();
        return $"/{string.Join('/', segments)}";
    }

    private static string GetElementSegment(XmlElement element)
    {
        var position = 1;
        var hasSameNameSibling = false;
        for (var sibling = element.PreviousSibling; sibling is not null; sibling = sibling.PreviousSibling)
        {
            if (IsSameName(sibling, element))
            {
                position++;
                hasSameNameSibling = true;
            }
        }
        for (
            var sibling = element.NextSibling;
            sibling is not null && !hasSameNameSibling;
            sibling = sibling.NextSibling
        )
        {
            hasSameNameSibling = IsSameName(sibling, element);
        }

        return hasSameNameSibling ? $"{element.Name}[{position}]" : element.Name;
    }

    private static bool IsSameName(XmlNode sibling, XmlElement element) =>
        sibling.NodeType == XmlNodeType.Element
        && sibling.LocalName == element.LocalName
        && sibling.NamespaceURI == element.NamespaceURI;
}
