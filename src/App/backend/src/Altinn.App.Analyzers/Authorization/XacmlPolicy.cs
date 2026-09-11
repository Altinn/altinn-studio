using System.Xml;
using System.Xml.Linq;

namespace Altinn.App.Analyzers.Authorization;

/// <summary>The outcome of asking whether the app owner is permitted something.</summary>
internal enum GrantResult
{
    /// <summary>A Permit rule definitely applies to the app owner's request.</summary>
    Granted,

    /// <summary>No rule can apply - the grant is definitely absent.</summary>
    Missing,

    /// <summary>
    /// A rule might apply, but deciding it statically is not possible (a Condition, an attribute or
    /// match function this analysis does not model, or a grant scoped to a single task where the
    /// app needs one that holds in any state). Reported as a warning, never as an error.
    /// </summary>
    Inconclusive,
}

/// <summary>
/// The app's XACML policy, evaluated against the request Storage makes on the app's behalf: the app
/// owner as subject, this app as the resource, and one of a set of candidate actions.
/// </summary>
/// <remarks>
/// Only the parts of XACML an Altinn app policy actually uses are modeled. Anything outside that
/// (custom attributes, non-equality match functions, conditions) yields
/// <see cref="GrantResult.Inconclusive"/> rather than a verdict, so an unusual but valid policy can
/// never fail a build.
/// </remarks>
internal sealed class XacmlPolicy
{
    private const string SubjectCategory = "urn:oasis:names:tc:xacml:1.0:subject-category:access-subject";
    private const string ResourceCategory = "urn:oasis:names:tc:xacml:3.0:attribute-category:resource";
    private const string ActionCategory = "urn:oasis:names:tc:xacml:3.0:attribute-category:action";
    private const string ActionAttributeId = "urn:oasis:names:tc:xacml:1.0:action:action-id";
    private const string OrgAttributeId = "urn:altinn:org";
    private const string AppAttributeId = "urn:altinn:app";
    private const string TaskAttributeId = "urn:altinn:task";
    private const string EndEventAttributeId = "urn:altinn:end-event";

    private const string StringEqual = "urn:oasis:names:tc:xacml:1.0:function:string-equal";
    private const string StringEqualIgnoreCase = "urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case";

    /// <summary>Placeholders a Studio-generated policy carries until they are substituted at deploy time.</summary>
    internal const string OrgPlaceholder = "[ORG]";
    internal const string AppPlaceholder = "[APP]";

    private readonly XElement _root;

    private XacmlPolicy(XElement root)
    {
        _root = root;
        HasDenyRules = Rules()
            .Any(rule => string.Equals(rule.Attribute("Effect")?.Value, "Deny", StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>
    /// Whether the policy contains Deny rules. With a deny-overrides combining algorithm, a Permit
    /// this analysis finds can still be overridden, so no verdict is safe.
    /// </summary>
    internal bool HasDenyRules { get; }

    /// <summary>
    /// The XACML 3.0 core schema namespace, which every Studio-generated policy declares. Requiring
    /// it is what makes the structural reading below sound: the element names this class looks for
    /// (<c>Rule</c>, <c>AnyOf</c>, <c>AllOf</c>, <c>Match</c>) only carry XACML 3.0 semantics inside
    /// it. An XACML 2.0 policy, for instance, spells its target out as
    /// <c>Target/Subjects/Resources/Actions</c> - reading that as 3.0 would find no <c>AnyOf</c> at
    /// all and conclude that every rule applies to every request.
    /// </summary>
    private const string Xacml30Namespace = "urn:oasis:names:tc:xacml:3.0:core:schema:wd-17";

    /// <summary>
    /// Parses the policy, or returns null when it is not a document this analysis can read as an
    /// XACML 3.0 policy - which the caller reports as not verifiable rather than as a missing grant.
    /// </summary>
    internal static XacmlPolicy? TryParse(string xml)
    {
        try
        {
            var document = XDocument.Parse(xml, LoadOptions.SetLineInfo);
            if (document.Root is not { } root || root.Name.LocalName != "Policy")
            {
                return null;
            }

            // Compared as a namespace, so any prefix (or none) works - only the URI matters.
            return root.Name.Namespace == Xacml30Namespace ? new XacmlPolicy(root) : null;
        }
        catch (XmlException)
        {
            return null;
        }
    }

    /// <summary>The policy root, whose position anchors the reported diagnostics.</summary>
    internal IXmlLineInfo RootLineInfo => _root;

    /// <summary>
    /// Determines the org/app values to check grants against. A Studio-generated policy uses the
    /// <c>[ORG]</c>/<c>[APP]</c> placeholders, and when the policy uses them, so do we. Otherwise
    /// applicationmetadata.json is authoritative: a policy may legitimately mention other orgs (a
    /// cross-org data-access rule), so picking "the" org out of the policy risks the wrong one.
    /// </summary>
    internal (string Org, string App) ResolveOrgAndApp(string? metadataOrg, string? metadataApp)
    {
        // Resolved per attribute rather than as a pair: a hand-edited policy can carry the org
        // placeholder next to a substituted app value (or the reverse), and assuming both follow the
        // same convention would compare a substituted value against a placeholder, fail the resource
        // match, and report a grant the policy plainly makes as missing.
        var org = HasMatchWithValue(OrgAttributeId, ResourceCategory, OrgPlaceholder)
            ? OrgPlaceholder
            : metadataOrg ?? FirstMatchValue(OrgAttributeId, ResourceCategory) ?? OrgPlaceholder;

        var app = HasMatchWithValue(AppAttributeId, ResourceCategory, AppPlaceholder)
            ? AppPlaceholder
            : metadataApp ?? FirstMatchValue(AppAttributeId, ResourceCategory) ?? AppPlaceholder;

        return (org, app);
    }

    /// <summary>
    /// Whether the app owner is permitted at least one of <paramref name="anyOfActions"/>. Storage
    /// permits an operation when any single candidate action is permitted, so this mirrors that.
    /// </summary>
    internal GrantResult Evaluate(
        string org,
        string app,
        IReadOnlyList<string> anyOfActions,
        HashSet<string>? taskScope,
        HashSet<string>? endEventIds
    )
    {
        var result = GrantResult.Missing;
        foreach (var action in anyOfActions)
        {
            switch (EvaluateSingleAction(org, app, action, taskScope, endEventIds))
            {
                case GrantResult.Granted:
                    return GrantResult.Granted;
                case GrantResult.Inconclusive:
                    result = GrantResult.Inconclusive;
                    break;
            }
        }

        return result;
    }

    private GrantResult EvaluateSingleAction(
        string org,
        string app,
        string action,
        HashSet<string>? taskScope,
        HashSet<string>? endEventIds
    )
    {
        var result = GrantResult.Missing;
        foreach (var rule in Rules())
        {
            if (!string.Equals(rule.Attribute("Effect")?.Value, "Permit", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var outcome = EvaluateTarget(rule, org, app, action, taskScope, endEventIds);

            // A Condition narrows the rule in ways this analysis cannot evaluate, so a rule that
            // would otherwise apply can only ever be inconclusive.
            if (outcome == MatchOutcome.Satisfied && Children(rule, "Condition").Any())
            {
                outcome = MatchOutcome.Unknown;
            }

            switch (outcome)
            {
                case MatchOutcome.Satisfied:
                    return GrantResult.Granted;
                case MatchOutcome.Unknown:
                    result = GrantResult.Inconclusive;
                    break;
            }
        }

        return result;
    }

    /// <summary>
    /// Evaluates a rule's Target with XACML semantics: AND across AnyOf, OR across AllOf, AND
    /// across Match. A missing or empty Target applies to every request.
    /// </summary>
    private static MatchOutcome EvaluateTarget(
        XElement rule,
        string org,
        string app,
        string action,
        HashSet<string>? taskScope,
        HashSet<string>? endEventIds
    )
    {
        var target = Children(rule, "Target").FirstOrDefault();
        if (target is null)
        {
            return MatchOutcome.Satisfied;
        }

        var result = MatchOutcome.Satisfied;
        foreach (var anyOf in Children(target, "AnyOf"))
        {
            var anyOfOutcome = MatchOutcome.Unsatisfied;
            foreach (var allOf in Children(anyOf, "AllOf"))
            {
                var allOfOutcome = MatchOutcome.Satisfied;
                foreach (var match in Children(allOf, "Match"))
                {
                    allOfOutcome = And(allOfOutcome, Evaluate(match, org, app, action, taskScope, endEventIds));
                }

                anyOfOutcome = Or(anyOfOutcome, allOfOutcome);
            }

            result = And(result, anyOfOutcome);
        }

        return result;
    }

    /// <summary>
    /// Evaluates a single Match against the request the app makes as the service owner.
    /// </summary>
    private static MatchOutcome Evaluate(
        XElement match,
        string org,
        string app,
        string action,
        HashSet<string>? taskScope,
        HashSet<string>? endEventIds
    )
    {
        var designator = Children(match, "AttributeDesignator").FirstOrDefault();
        var attributeId = designator?.Attribute("AttributeId")?.Value;
        var category = designator?.Attribute("Category")?.Value;
        if (attributeId is null || category is null)
        {
            return MatchOutcome.Unknown;
        }

        // The subject is always the app owner. A subject constraint on anything else - a role code,
        // a party type, a user id - can never be satisfied by a service owner token, and that is a
        // definite answer rather than an unknown one.
        if (category == SubjectCategory)
        {
            return attributeId == OrgAttributeId ? ValueMatches(match, org) : MatchOutcome.Unsatisfied;
        }

        if (category == ResourceCategory && attributeId == OrgAttributeId)
        {
            return ValueMatches(match, org);
        }

        if (category == ResourceCategory && attributeId == AppAttributeId)
        {
            return ValueMatches(match, app);
        }

        if (category == ActionCategory && attributeId == ActionAttributeId)
        {
            return ValueMatches(match, action);
        }

        if (category == ResourceCategory && attributeId == TaskAttributeId)
        {
            // A task-scoped grant counts for a transition inside that task. For an action the app
            // needs in any process state there is no task to check it against, so such a grant may
            // or may not cover what the app does - hence unknown rather than unsatisfied.
            if (taskScope is null)
            {
                return MatchOutcome.Unknown;
            }

            return ValueIsOneOf(match, taskScope);
        }

        if (category == ResourceCategory && attributeId == EndEventAttributeId)
        {
            // 'complete' only ever happens at an end event, so end-event scoping does not narrow it
            // - but only when the match names an end event the process actually has. Without a
            // process to check against, the answer is unknown.
            if (!string.Equals(action, "complete", StringComparison.OrdinalIgnoreCase))
            {
                return MatchOutcome.Unsatisfied;
            }

            if (endEventIds is null)
            {
                return MatchOutcome.Unknown;
            }

            return ValueIsOneOf(match, endEventIds);
        }

        // Some resource or environment attribute this analysis does not model. Whether the app's
        // request carries it is unknowable here.
        return MatchOutcome.Unknown;
    }

    /// <summary>
    /// Compares a Match's literal value with the request's. Match functions other than string
    /// equality (regular expressions, bag functions) are not modeled, so they yield unknown.
    /// </summary>
    private static MatchOutcome ValueMatches(XElement match, string expected)
    {
        if (!IsModeledEquality(match))
        {
            return MatchOutcome.Unknown;
        }

        return string.Equals(MatchValue(match), expected, ComparisonFor(match))
            ? MatchOutcome.Satisfied
            : MatchOutcome.Unsatisfied;
    }

    /// <summary>
    /// Whether a Match's literal is one of a set of ids - how task and end-event scoping is checked.
    /// Ids are compared exactly (BPMN ids are case-sensitive), but the declared match function still
    /// has to be one this analysis models, or the answer is unknown rather than a verdict.
    /// </summary>
    private static MatchOutcome ValueIsOneOf(XElement match, HashSet<string> allowedIds)
    {
        if (!IsModeledEquality(match))
        {
            return MatchOutcome.Unknown;
        }

        var comparison = ComparisonFor(match);
        return MatchValue(match) is { } value && allowedIds.Any(id => string.Equals(id, value, comparison))
            ? MatchOutcome.Satisfied
            : MatchOutcome.Unsatisfied;
    }

    /// <summary>
    /// How to compare a Match's literal, per the function it declares. XACML's <c>string-equal</c> is
    /// case-sensitive and only <c>string-equal-ignore-case</c> folds case. Reading both leniently
    /// would let a policy granting <c>READ</c> satisfy a check for <c>read</c> while Storage's own
    /// evaluation rejects it - silently missing exactly the defect this analysis exists to catch.
    /// </summary>
    private static StringComparison ComparisonFor(XElement match) =>
        match.Attribute("MatchId")?.Value == StringEqualIgnoreCase
            ? StringComparison.OrdinalIgnoreCase
            : StringComparison.Ordinal;

    /// <summary>
    /// Whether the Match declares one of the two string-equality functions this analysis understands.
    /// Anything else - a regular expression, a bag function - is not modeled, and a Match using one
    /// can neither be confirmed nor ruled out.
    /// </summary>
    private static bool IsModeledEquality(XElement match)
    {
        var matchId = match.Attribute("MatchId")?.Value;
        return matchId == StringEqual || matchId == StringEqualIgnoreCase;
    }

    private IEnumerable<XElement> Rules() => Children(_root, "Rule");

    private static IEnumerable<XElement> Children(XElement element, string localName) =>
        element.Elements().Where(e => e.Name.LocalName == localName);

    private static string? MatchValue(XElement match) => Children(match, "AttributeValue").FirstOrDefault()?.Value;

    private bool HasMatchWithValue(string attributeId, string category, string value) =>
        Matches()
            .Any(m =>
                Targets(m, attributeId, category) && string.Equals(MatchValue(m), value, StringComparison.Ordinal)
            );

    private string? FirstMatchValue(string attributeId, string category) =>
        Matches()
            .Where(m => Targets(m, attributeId, category))
            .Select(MatchValue)
            .FirstOrDefault(v => !string.IsNullOrEmpty(v));

    private IEnumerable<XElement> Matches() => _root.Descendants().Where(e => e.Name.LocalName == "Match");

    private static bool Targets(XElement match, string attributeId, string category)
    {
        var designator = Children(match, "AttributeDesignator").FirstOrDefault();
        return designator?.Attribute("AttributeId")?.Value == attributeId
            && designator.Attribute("Category")?.Value == category;
    }

    /// <summary>Three-valued logic, so an unmodeled construct never masquerades as a verdict.</summary>
    private enum MatchOutcome
    {
        Satisfied,
        Unsatisfied,
        Unknown,
    }

    private static MatchOutcome And(MatchOutcome left, MatchOutcome right)
    {
        if (left == MatchOutcome.Unsatisfied || right == MatchOutcome.Unsatisfied)
        {
            return MatchOutcome.Unsatisfied;
        }

        return left == MatchOutcome.Unknown || right == MatchOutcome.Unknown
            ? MatchOutcome.Unknown
            : MatchOutcome.Satisfied;
    }

    private static MatchOutcome Or(MatchOutcome left, MatchOutcome right)
    {
        if (left == MatchOutcome.Satisfied || right == MatchOutcome.Satisfied)
        {
            return MatchOutcome.Satisfied;
        }

        return left == MatchOutcome.Unknown || right == MatchOutcome.Unknown
            ? MatchOutcome.Unknown
            : MatchOutcome.Unsatisfied;
    }
}
