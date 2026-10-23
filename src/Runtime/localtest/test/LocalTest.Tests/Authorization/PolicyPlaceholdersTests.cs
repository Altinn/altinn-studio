using System.Xml;
using System.Xml.Linq;
using LocalTest.Helpers.Authorization;
using Xunit;

namespace LocalTest.Tests.Authorization;

public class PolicyPlaceholdersTests
{
    private const string SubjectCategory = "urn:oasis:names:tc:xacml:1.0:subject-category:access-subject";
    private const string ResourceCategory = "urn:oasis:names:tc:xacml:3.0:attribute-category:resource";

    private const string Policy = """
        <?xml version="1.0" encoding="utf-8"?>
        <xacml:Policy PolicyId="urn:altinn:resource:app_[ORG]_[APP]:policyid:1" xmlns:xacml="urn:oasis:names:tc:xacml:3.0:core:schema:wd-17">
          <xacml:Target />
          <xacml:Rule RuleId="urn:altinn:resource:app_[ORG]_[APP]:policyid:1:ruleid:1" Effect="Permit">
            <xacml:Description>Grants rights to the organization that owns the service ([org]).</xacml:Description>
            <xacml:Target>
              <xacml:AnyOf>
                <xacml:AllOf>
                  <xacml:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case">
                    <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">[org]</xacml:AttributeValue>
                    <xacml:AttributeDesignator AttributeId="urn:altinn:org" Category="urn:oasis:names:tc:xacml:1.0:subject-category:access-subject" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
                  </xacml:Match>
                </xacml:AllOf>
                <xacml:AllOf>
                  <xacml:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                    <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">[ORG]</xacml:AttributeValue>
                    <xacml:AttributeDesignator Category="urn:oasis:names:tc:xacml:1.0:subject-category:access-subject" AttributeId="urn:altinn:org" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
                  </xacml:Match>
                </xacml:AllOf>
                <xacml:AllOf>
                  <xacml:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case">
                    <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">dagl</xacml:AttributeValue>
                    <xacml:AttributeDesignator AttributeId="urn:altinn:rolecode" Category="urn:oasis:names:tc:xacml:1.0:subject-category:access-subject" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
                  </xacml:Match>
                </xacml:AllOf>
              </xacml:AnyOf>
              <xacml:AnyOf>
                <xacml:AllOf>
                  <xacml:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                    <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">[ORG]</xacml:AttributeValue>
                    <xacml:AttributeDesignator AttributeId="urn:altinn:org" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:resource" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
                  </xacml:Match>
                  <xacml:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                    <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">[APP]</xacml:AttributeValue>
                    <xacml:AttributeDesignator AttributeId="urn:altinn:app" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:resource" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
                  </xacml:Match>
                </xacml:AllOf>
              </xacml:AnyOf>
            </xacml:Target>
          </xacml:Rule>
        </xacml:Policy>
        """;

    [Fact]
    public void Replace_OrdinaryOrg_UsesTheOrgEverywhereAndKeepsTheLayout()
    {
        string result = PolicyPlaceholders.Replace(Policy, "brg", "my-app");

        string expected = Policy.Replace("[org]", "brg").Replace("[ORG]", "brg").Replace("[APP]", "my-app");
        Assert.Equal(Lines(expected), Lines(result));
    }

    [Fact]
    public void Replace_Ttd_UsesDigdirAsServiceOwnerSubjectAndTtdForTheApp()
    {
        string result = PolicyPlaceholders.Replace(Policy, "ttd", "my-app");

        XDocument policy = XDocument.Parse(result);
        Assert.Equal(["digdir", "digdir"], OrgMatchValues(policy, SubjectCategory));
        Assert.Equal(["ttd"], OrgMatchValues(policy, ResourceCategory));
        Assert.Equal("urn:altinn:resource:app_ttd_my-app:policyid:1", (string)policy.Root.Attribute("PolicyId"));
        Assert.Contains("owns the service (ttd)", result);
        Assert.Contains(">dagl</xacml:AttributeValue>", result);
        Assert.DoesNotContain("[", result);
    }

    [Fact]
    public void Replace_Ttd_HandlesPoliciesWithoutNamespacePrefixAndByteOrderMark()
    {
        string policy = "﻿" + Policy.Replace("<xacml:", "<").Replace("</xacml:", "</").Replace("xmlns:xacml", "xmlns");

        string result = PolicyPlaceholders.Replace(policy, "ttd", "my-app");

        XDocument parsed = XDocument.Parse(result);
        Assert.Equal(["digdir", "digdir"], OrgMatchValues(parsed, SubjectCategory));
        Assert.Equal(["ttd"], OrgMatchValues(parsed, ResourceCategory));
        Assert.StartsWith("<?xml", result);
    }

    [Fact]
    public void Replace_MalformedPolicy_Throws()
    {
        Assert.Throws<XmlException>(() => PolicyPlaceholders.Replace("<xacml:Policy>", "ttd", "my-app"));
    }

    [Theory]
    [InlineData("ttd", "digdir")]
    [InlineData("TTD", "digdir")]
    [InlineData("digdir", "digdir")]
    [InlineData("brg", "brg")]
    public void AuthenticatedOrg_MapsOnlyTtd(string org, string expected)
    {
        Assert.Equal(expected, ServiceOwnerOrg.AuthenticatedOrg(org));
    }

    private static List<string> OrgMatchValues(XDocument policy, string category)
    {
        return policy
            .Descendants()
            .Where(element => element.Name.LocalName == "Match")
            .Where(match =>
                match
                    .Elements()
                    .Any(designator =>
                        designator.Name.LocalName == "AttributeDesignator"
                        && (string?)designator.Attribute("AttributeId") == "urn:altinn:org"
                        && (string?)designator.Attribute("Category") == category
                    )
            )
            .Select(match => match.Elements().First(element => element.Name.LocalName == "AttributeValue").Value)
            .ToList();
    }

    private static string[] Lines(string text)
    {
        return text.Split(["\r\n", "\n"], StringSplitOptions.None);
    }
}
