using System.Text;

namespace Altinn.App.Analyzers.Tests.Authorization;

/// <summary>
/// Builds XACML policy documents in the shape Studio generates them: namespace-prefixed elements,
/// <c>[ORG]</c>/<c>[APP]</c> placeholders, and a lower-cased org value in the subject match (which is
/// how the real templates are written).
/// </summary>
internal static class PolicyFixtures
{
    internal const string Org = "[ORG]";
    internal const string App = "[APP]";

    internal const string StringEqual = "urn:oasis:names:tc:xacml:1.0:function:string-equal";
    internal const string StringEqualIgnoreCase = "urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case";

    private const string SubjectCategory = "urn:oasis:names:tc:xacml:1.0:subject-category:access-subject";
    private const string ResourceCategory = "urn:oasis:names:tc:xacml:3.0:attribute-category:resource";
    private const string ActionCategory = "urn:oasis:names:tc:xacml:3.0:attribute-category:action";
    private const string ActionAttributeId = "urn:oasis:names:tc:xacml:1.0:action:action-id";
    private const string StringType = "http://www.w3.org/2001/XMLSchema#string";

    /// <summary>
    /// The org rules the standard policy template ships: read/write/instantiate in any process state,
    /// and complete at the end event.
    /// </summary>
    internal static string StandardOrgRules =>
        OrgRule(["read", "write", "instantiate"]) + OrgRule(["complete"], endEvent: ProcessFixtures.EndEventId);

    internal static string Policy(params string[] rules) =>
        $"""
            <?xml version="1.0" encoding="utf-8"?>
            <xacml:Policy PolicyId="urn:altinn:resource:app_org_app:policyid:1" Version="1.0" RuleCombiningAlgId="urn:oasis:names:tc:xacml:3.0:rule-combining-algorithm:deny-overrides" xmlns:xacml="urn:oasis:names:tc:xacml:3.0:core:schema:wd-17">
              <xacml:Target />
            {string.Concat(rules)}
            </xacml:Policy>
            """;

    /// <summary>A rule granting the org subject the given actions on this app.</summary>
    internal static string OrgRule(
        string[] actions,
        string? task = null,
        string? endEvent = null,
        string effect = "Permit",
        bool condition = false,
        string org = Org,
        string app = App,
        string matchId = StringEqualIgnoreCase,
        string taskMatchId = StringEqual,
        string endEventMatchId = StringEqual
    )
    {
        var resource = new StringBuilder();
        resource.Append(Match(StringEqual, org, "urn:altinn:org", ResourceCategory));
        resource.Append(Match(StringEqual, app, "urn:altinn:app", ResourceCategory));
        if (task is not null)
        {
            resource.Append(Match(taskMatchId, task, "urn:altinn:task", ResourceCategory));
        }

        if (endEvent is not null)
        {
            resource.Append(Match(endEventMatchId, endEvent, "urn:altinn:end-event", ResourceCategory));
        }

        return Rule(
            effect,
            // The templates lower-case the org in the subject match but not in the resource match.
            subject: Match(StringEqualIgnoreCase, org.ToLowerInvariant(), "urn:altinn:org", SubjectCategory),
            resource: resource.ToString(),
            actions: actions,
            actionMatchId: matchId,
            condition: condition
        );
    }

    /// <summary>A rule granting an end user (by role code) the given actions on this app.</summary>
    internal static string RoleRule(params string[] actions) =>
        Rule(
            "Permit",
            subject: Match(StringEqualIgnoreCase, "dagl", "urn:altinn:rolecode", SubjectCategory),
            resource: Match(StringEqual, Org, "urn:altinn:org", ResourceCategory)
                + Match(StringEqual, App, "urn:altinn:app", ResourceCategory),
            actions: actions,
            actionMatchId: StringEqualIgnoreCase,
            condition: false
        );

    private static string Rule(
        string effect,
        string subject,
        string resource,
        string[] actions,
        string actionMatchId,
        bool condition
    )
    {
        var actionMatches = new StringBuilder();
        foreach (var action in actions)
        {
            actionMatches.Append("<xacml:AllOf>");
            actionMatches.Append(Match(actionMatchId, action, ActionAttributeId, ActionCategory));
            actionMatches.Append("</xacml:AllOf>");
        }

        var conditionXml = condition
            ? """
                <xacml:Condition>
                  <xacml:Apply FunctionId="urn:oasis:names:tc:xacml:1.0:function:string-is-in" />
                </xacml:Condition>
                """
            : "";

        return $"""
              <xacml:Rule RuleId="urn:altinn:example:ruleid:{Guid.NewGuid()}" Effect="{effect}">
                <xacml:Target>
                  <xacml:AnyOf><xacml:AllOf>{subject}</xacml:AllOf></xacml:AnyOf>
                  <xacml:AnyOf><xacml:AllOf>{resource}</xacml:AllOf></xacml:AnyOf>
                  <xacml:AnyOf>{actionMatches}</xacml:AnyOf>
                </xacml:Target>
                {conditionXml}
              </xacml:Rule>

            """;
    }

    private static string Match(string matchId, string value, string attributeId, string category) =>
        $"""
            <xacml:Match MatchId="{matchId}">
              <xacml:AttributeValue DataType="{StringType}">{value}</xacml:AttributeValue>
              <xacml:AttributeDesignator AttributeId="{attributeId}" Category="{category}" DataType="{StringType}" MustBePresent="false" />
            </xacml:Match>
            """;
}
