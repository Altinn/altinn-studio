using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Validation;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class CrossPolicyAppMatchesMetadataRuleTests
{
    private const string Rule = "CROSS-POLICY-APP-MATCHES-METADATA";
    private const string Subject = "urn:oasis:names:tc:xacml:1.0:subject-category:access-subject";
    private const string Resource = "urn:oasis:names:tc:xacml:3.0:attribute-category:resource";

    private static string Match(string attribute, string value, string category) =>
        $"""
            <xacml:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
              <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">{value}</xacml:AttributeValue>
              <xacml:AttributeDesignator AttributeId="{attribute}" Category="{category}" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
            </xacml:Match>
            """;

    private static IReadOnlyList<Finding> Validate(string subjectMatch, string resourceOrg, string resourceApp)
    {
        var resourceMatches =
            Match("urn:altinn:org", resourceOrg, Resource) + Match("urn:altinn:app", resourceApp, Resource);
        var policy = $"""
            <?xml version="1.0" encoding="utf-8"?>
            <xacml:Policy PolicyId="p" Version="1.0" RuleCombiningAlgId="urn:oasis:names:tc:xacml:3.0:rule-combining-algorithm:deny-overrides" xmlns:xacml="urn:oasis:names:tc:xacml:3.0:core:schema:wd-17">
              <xacml:Target />
              <xacml:Rule RuleId="r1" Effect="Permit">
                <xacml:Target>
                  <xacml:AnyOf><xacml:AllOf>{subjectMatch}</xacml:AllOf></xacml:AnyOf>
                  <xacml:AnyOf><xacml:AllOf>{resourceMatches}</xacml:AllOf></xacml:AnyOf>
                </xacml:Target>
              </xacml:Rule>
            </xacml:Policy>
            """;
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/my-app"),
                ["App/config/authorization/policy.xml"] = policy,
            }
        );
        return AppConfigEngine.Open(dir).Validate().Findings.Where(f => f.RuleId == Rule).ToList();
    }

    [Theory]
    [InlineData("digdir")]
    [InlineData("nhn")]
    public void SubjectOrg_NamingAnotherServiceOwner_IsNotFlagged(string grantedOrg) =>
        Assert.Empty(Validate(Match("urn:altinn:org", grantedOrg, Subject), "[ORG]", "[APP]"));

    [Fact]
    public void ResourceOrg_ThatDiffersFromTheAppId_IsFlagged()
    {
        var finding = Assert.Single(Validate(Match("urn:altinn:org", "ttd", Subject), "tab", "my-app"));

        Assert.Contains("urn:altinn:org is \"tab\"", finding.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void ResourceApp_LeftFromACopiedApp_IsFlagged()
    {
        var finding = Assert.Single(Validate(Match("urn:altinn:rolecode", "dagl", Subject), "ttd", "other-app"));

        Assert.Contains("urn:altinn:app is \"other-app\"", finding.Message, StringComparison.Ordinal);
    }
}
