namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Composable builders for XACML policy fixtures, mirroring the shapes Studio and hand-edited
/// policies use. Kept intentionally textual: the migrator under test does textual insertion, so the
/// fixtures should look like real files.
/// </summary>
internal static class PolicyXmlBuilder
{
    private const string Header = """
        <?xml version="1.0" encoding="utf-8"?>
        <xacml:Policy xmlns:xacml="urn:oasis:names:tc:xacml:3.0:core:schema:wd-17" PolicyId="urn:altinn:policyid:1" Version="1.0" RuleCombiningAlgId="urn:oasis:names:tc:xacml:3.0:rule-combining-algorithm:deny-overrides">
          <xacml:Target />
        """;

    public const string EqualFunction = "urn:oasis:names:tc:xacml:1.0:function:string-equal";
    public const string EqualIgnoreCaseFunction = "urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case";
    public const string SubjectCategory = "urn:oasis:names:tc:xacml:1.0:subject-category:access-subject";
    public const string ResourceCategory = "urn:oasis:names:tc:xacml:3.0:attribute-category:resource";
    public const string ActionCategory = "urn:oasis:names:tc:xacml:3.0:attribute-category:action";
    public const string ActionAttributeId = "urn:oasis:names:tc:xacml:1.0:action:action-id";

    public static string Policy(params string[] rules) =>
        Header + "\n" + string.Join("\n", rules) + "\n</xacml:Policy>";

    public static string Rule(string id, params string[] anyOfs) =>
        $"  <xacml:Rule RuleId=\"urn:altinn:example:ruleid:{id}\" Effect=\"Permit\">\n"
        + "    <xacml:Target>\n"
        + string.Join("\n", anyOfs)
        + "\n    </xacml:Target>\n"
        + "  </xacml:Rule>";

    public static string AnyOf(params string[] allOfs) =>
        "      <xacml:AnyOf>\n" + string.Join("\n", allOfs) + "\n      </xacml:AnyOf>";

    public static string AllOf(params string[] matches) =>
        "        <xacml:AllOf>\n" + string.Join("\n", matches) + "\n        </xacml:AllOf>";

    public static string Match(string matchFunction, string value, string attributeId, string category) =>
        $"          <xacml:Match MatchId=\"{matchFunction}\">\n"
        + $"            <xacml:AttributeValue DataType=\"http://www.w3.org/2001/XMLSchema#string\">{value}</xacml:AttributeValue>\n"
        + $"            <xacml:AttributeDesignator AttributeId=\"{attributeId}\" Category=\"{category}\" DataType=\"http://www.w3.org/2001/XMLSchema#string\" MustBePresent=\"false\" />\n"
        + "          </xacml:Match>";

    public static string SubjectOrg(string org) =>
        Match(EqualIgnoreCaseFunction, org, "urn:altinn:org", SubjectCategory);

    public static string SubjectRole(string role) =>
        Match(EqualIgnoreCaseFunction, role, "urn:altinn:rolecode", SubjectCategory);

    public static string ResourceOrg(string org) => Match(EqualFunction, org, "urn:altinn:org", ResourceCategory);

    public static string ResourceApp(string app) => Match(EqualFunction, app, "urn:altinn:app", ResourceCategory);

    public static string ResourceTask(string task) => Match(EqualFunction, task, "urn:altinn:task", ResourceCategory);

    public static string ResourceEndEvent(string endEvent) =>
        Match(EqualFunction, endEvent, "urn:altinn:end-event", ResourceCategory);

    public static string Action(string action) =>
        Match(EqualIgnoreCaseFunction, action, ActionAttributeId, ActionCategory);
}
