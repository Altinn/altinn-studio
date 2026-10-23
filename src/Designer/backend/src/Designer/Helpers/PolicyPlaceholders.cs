using System.Linq;
using System.Xml.Linq;

namespace Altinn.Studio.Designer.Helpers;

/// <summary>
/// Fills in the [org] and [app] placeholders of an authorization policy before it leaves Studio.
/// </summary>
public static class PolicyPlaceholders
{
    private const string OrgAttributeId = "urn:altinn:org";
    private const string SubjectCategory = "urn:oasis:names:tc:xacml:1.0:subject-category:access-subject";

    /// <summary>
    /// Replaces [org] and [ORG] with the owner of the app and [app] and [APP] with the app name. Where a rule matches
    /// the authenticated service owner (an access-subject match on urn:altinn:org), the placeholder instead becomes
    /// the org that service-owner tokens for the app actually carry, which differs from the owner for ttd apps.
    /// </summary>
    /// <exception cref="System.Xml.XmlException">The policy is not well-formed XML.</exception>
    public static string Replace(string policyXml, string org, string app)
    {
        XDocument policy = XDocument.Parse(policyXml.TrimStart('\uFEFF'), LoadOptions.PreserveWhitespace);
        string subjectOrg = OrgUtil.AuthenticatedOrg(org);

        foreach (XText text in policy.DescendantNodes().OfType<XText>())
        {
            text.Value = ReplacePlaceholders(text.Value, IsSubjectOrgValue(text.Parent) ? subjectOrg : org, app);
        }

        foreach (XAttribute attribute in policy.Descendants().Attributes())
        {
            attribute.Value = ReplacePlaceholders(attribute.Value, org, app);
        }

        // ToString leaves out the declaration but keeps the preserved whitespace after it.
        return policy.Declaration + policy.ToString(SaveOptions.DisableFormatting);
    }

    private static bool IsSubjectOrgValue(XElement? element)
    {
        return element?.Name.LocalName == "AttributeValue"
            && element.Parent?.Name.LocalName == "Match"
            && element
                .Parent.Elements()
                .Any(designator =>
                    designator.Name.LocalName == "AttributeDesignator"
                    && (string?)designator.Attribute("AttributeId") == OrgAttributeId
                    && (string?)designator.Attribute("Category") == SubjectCategory
                );
    }

    private static string ReplacePlaceholders(string value, string org, string app)
    {
        return value.Replace("[ORG]", org).Replace("[org]", org).Replace("[APP]", app).Replace("[app]", app);
    }
}
