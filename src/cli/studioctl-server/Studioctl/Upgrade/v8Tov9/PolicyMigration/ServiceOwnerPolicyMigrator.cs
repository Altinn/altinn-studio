using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Xml;
using System.Xml.Linq;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.PolicyMigration;

/// <summary>
/// Ensures the app's authorization policy lets the service owner (org) perform the process
/// transitions the v9 workflow engine persists to Storage out-of-band.
///
/// Under v8, process transitions were persisted in-app under the end user's token, so many app
/// policies never granted the org anything beyond instantiate/read. Under v9 the workflow engine
/// replays each transition as the service owner, which requires at minimum <c>read</c> and
/// <c>write</c> in any process state plus <c>complete</c> at the end event. The standard Studio
/// policy template has rules for this ("org can write ... for any states" / "org can complete ...");
/// this migrator detects apps whose policy lacks the equivalent grants and inserts a single rule
/// with the missing actions, using a minimal textual diff.
///
/// Task-specific actions (confirm, sign, pay, custom service-task types) are intentionally not
/// granted automatically - the migrator scans the process and warns about the ones the org likely
/// also needs.
/// </summary>
internal sealed class ServiceOwnerPolicyMigrator
{
    private const string SubjectCategory = "urn:oasis:names:tc:xacml:1.0:subject-category:access-subject";
    private const string ResourceCategory = "urn:oasis:names:tc:xacml:3.0:attribute-category:resource";
    private const string ActionCategory = "urn:oasis:names:tc:xacml:3.0:attribute-category:action";
    private const string ActionAttributeId = "urn:oasis:names:tc:xacml:1.0:action:action-id";
    private const string OrgAttributeId = "urn:altinn:org";
    private const string AppAttributeId = "urn:altinn:app";
    private const string TaskAttributeId = "urn:altinn:task";
    private const string EndEventAttributeId = "urn:altinn:end-event";

    /// <summary>Actions the engine needs in any process state (read/write) and at the end event (complete).</summary>
    private static readonly string[] _requiredActions = ["read", "write", "complete"];

    /// <summary>
    /// Task types whose process-next is authorized by the <c>write</c> action (see
    /// ProcessEngineAuthorizer in app-lib-dotnet). Anything else maps to a dedicated action.
    /// </summary>
    private static readonly string[] _taskTypesCoveredByWrite =
    [
        "data",
        "feedback",
        "pdf",
        "eFormidling",
        "fiksArkiv",
        "subformPdf",
    ];

    private readonly string _projectFolder;
    private readonly List<string> _warnings = new();
    private bool _manualActionRequired;

    public ServiceOwnerPolicyMigrator(string projectFolder)
    {
        _projectFolder = projectFolder;
    }

    /// <summary>
    /// Runs the migration. The result carries any warnings and whether manual follow-up is required
    /// (e.g. the analysis was inconclusive, or a required grant could not be inserted). No warnings and
    /// no manual action means the policy already covered everything.
    /// </summary>
    public async Task<MigrationResult> Migrate()
    {
        var policyFile = AppFiles.Resolve(_projectFolder, "config/authorization/policy.xml");
        if (policyFile is null)
        {
            // Nothing to inspect and nothing left half-done, so no manual follow-up is implied.
            _warnings.Add("Could not find config/authorization/policy.xml; skipped service-owner policy migration.");
            return Result();
        }

        string text;
        bool hadBom;
        try
        {
            (text, hadBom) = Utf8TextFile.Decode(await File.ReadAllBytesAsync(policyFile));
        }
        catch (DecoderFallbackException)
        {
            _manualActionRequired = true;
            _warnings.Add(
                $"{Path.GetFileName(policyFile)} is not valid UTF-8 (it may use a legacy encoding such as "
                    + "ISO-8859-1); skipped service-owner policy migration. Convert the file to UTF-8 and re-run "
                    + "the upgrade."
            );
            return Result();
        }

        XElement root;
        try
        {
            var doc = XDocument.Parse(text);
            if (doc.Root is null || doc.Root.Name.LocalName != "Policy")
            {
                _manualActionRequired = true;
                _warnings.Add(
                    "policy.xml does not contain a <Policy> root element; skipped service-owner policy migration."
                );
                return Result();
            }
            root = doc.Root;
        }
        catch (XmlException ex)
        {
            _manualActionRequired = true;
            _warnings.Add(
                $"Could not parse {Path.GetFileName(policyFile)} ({ex.Message}); skipped service-owner policy "
                    + "migration. Please verify the org has read/write/complete rights manually."
            );
            return Result();
        }

        var (orgValue, appValue) = await ResolveOrgAndAppValues(root);

        var processInfo = TryLoadProcessInfo();

        // The grant check below only recognizes Permit rules; with Deny rules present (and a
        // deny-overrides combining algorithm) a Permit we find may still be overridden, so any
        // "already granted" conclusion would be unreliable. Hand the analysis to the developer.
        if (HasDenyRules(root))
        {
            _manualActionRequired = true;
            var actionsToVerify = _requiredActions
                .Concat(processInfo?.TaskSpecificActions.Select(a => a.Action) ?? [])
                .Distinct(StringComparer.OrdinalIgnoreCase);
            _warnings.Add(
                "policy.xml contains one or more Deny rules, which this migration cannot evaluate "
                    + "statically; the analysis of the app owner's rights is inconclusive and no rule was "
                    + $"inserted. Please verify manually that the app owner '{orgValue}' is permitted (and "
                    + $"not denied) the action(s) [{string.Join(", ", actionsToVerify)}] on "
                    + $"{orgValue}/{appValue}, as the v9 workflow engine requires."
            );
            return Result();
        }

        if (processInfo is null && PolicyScopesByTaskOrEndEvent(root))
        {
            _manualActionRequired = true;
            _warnings.Add(
                "Could not read config/process/process.bpmn, so task- and end-event-scoped grants in "
                    + "policy.xml could not be verified against the process and were not counted when "
                    + "checking the app owner's rights."
            );
        }

        var missingActions = _requiredActions
            .Where(action =>
                !IsActionGrantedToOrg(
                    root,
                    orgValue,
                    appValue,
                    action,
                    taskScopeIds: null,
                    endEventIds: processInfo?.EndEventIds
                )
            )
            .ToList();

        if (missingActions.Count > 0)
        {
            var updatedText = InsertOrgRule(policyFile, text, root, orgValue, appValue, missingActions);
            if (updatedText is not null)
            {
                await Utf8TextFile.Write(policyFile, updatedText, withBom: hadBom);
                _warnings.Add(
                    $"Added a policy rule granting the app owner '{orgValue}' the action(s) "
                        + $"[{string.Join(", ", missingActions)}] on {orgValue}/{appValue} in any process state. "
                        + "The v9 workflow engine persists process transitions to Storage as the service owner, "
                        + "so these rights are required for the process to advance. Please review the new rule."
                );
                // Re-parse so the task-specific check below sees the inserted rule too. InsertOrgRule
                // already validated that the updated text parses.
                root = XDocument.Parse(updatedText).Root ?? root;
            }
            else
            {
                // InsertOrgRule could not add the rule safely (it warned with specifics); the required
                // grant is still missing, so the developer must add it by hand.
                _manualActionRequired = true;
            }
        }

        WarnAboutTaskSpecificActions(root, orgValue, appValue, processInfo);

        return Result();
    }

    private MigrationResult Result() => new(_manualActionRequired, _warnings);

    /// <summary>
    /// Determines the org/app values to check grants for and to use in the inserted rule.
    /// Studio-generated policies use the <c>[ORG]</c>/<c>[APP]</c> template placeholders (substituted
    /// at deploy time); when the policy uses them anywhere, so do we. Otherwise the authoritative
    /// source is applicationmetadata.json - a policy can legally mention other orgs (e.g. a cross-org
    /// data-access rule), so scanning the policy for "the" org risks picking the wrong one. Only when
    /// neither is available do we fall back to the first value the policy uses, then the placeholders.
    /// </summary>
    private async Task<(string Org, string App)> ResolveOrgAndAppValues(XElement root)
    {
        var usesPlaceholders =
            HasMatchWithValue(root, OrgAttributeId, ResourceCategory, "[ORG]")
            || HasMatchWithValue(root, AppAttributeId, ResourceCategory, "[APP]");
        if (usesPlaceholders)
            return ("[ORG]", "[APP]");

        var (metadataOrg, metadataApp) = await GetOrgAndAppFromApplicationMetadata();

        var org = metadataOrg ?? FindFirstMatchValue(root, OrgAttributeId, ResourceCategory) ?? "[ORG]";
        var app = metadataApp ?? FindFirstMatchValue(root, AppAttributeId, ResourceCategory) ?? "[APP]";
        return (org, app);
    }

    private async Task<(string? Org, string? App)> GetOrgAndAppFromApplicationMetadata()
    {
        var metadataFile = AppFiles.Resolve(_projectFolder, "config/applicationmetadata.json");
        if (metadataFile is null)
            return (null, null);

        try
        {
            using var doc = JsonDocument.Parse(await File.ReadAllTextAsync(metadataFile));
            var org = doc.RootElement.TryGetProperty("org", out var orgProp) ? orgProp.GetString() : null;

            // "id" is "org/app"; it is also the org fallback when the dedicated field is missing.
            string? app = null;
            if (
                doc.RootElement.TryGetProperty("id", out var idProp)
                && idProp.GetString() is { } id
                && id.IndexOf('/', StringComparison.Ordinal) is var slash and > 0
                && slash < id.Length - 1
            )
            {
                org ??= id[..slash];
                app = id[(slash + 1)..];
            }

            return (string.IsNullOrWhiteSpace(org) ? null : org, string.IsNullOrWhiteSpace(app) ? null : app);
        }
        catch (Exception ex) when (ex is JsonException or IOException)
        {
            return (null, null);
        }
    }

    private static bool HasMatchWithValue(XElement root, string attributeId, string category, string value) =>
        root.Descendants()
            .Where(e => e.Name.LocalName == "Match")
            .Any(m =>
                MatchTargets(m, attributeId, category) && string.Equals(MatchValue(m), value, StringComparison.Ordinal)
            );

    private static string? FindFirstMatchValue(XElement root, string attributeId, string category)
    {
        foreach (var match in root.Descendants().Where(e => e.Name.LocalName == "Match"))
        {
            if (MatchTargets(match, attributeId, category) && MatchValue(match) is { Length: > 0 } value)
                return value;
        }

        return null;
    }

    /// <summary>
    /// Checks whether some Permit rule grants <paramref name="action"/> to the org subject for this
    /// app's resources, by evaluating each rule's Target with proper XACML semantics against a
    /// simulated engine request (AND over AnyOf, OR over AllOf, AND over Match). Rules scoped to a
    /// specific task (<c>urn:altinn:task</c>) only count when <paramref name="taskScopeIds"/> is
    /// non-null and the Match names one of those tasks: task-scoped grants work for transitions
    /// inside that task, but not as the state-independent baseline the engine needs for read/write.
    /// End-event scoping counts for <c>complete</c> when the Match names an end event that actually
    /// exists in the process (<paramref name="endEventIds"/>), since that action is only used at end
    /// events (this is how the standard template grants it).
    /// </summary>
    private static bool IsActionGrantedToOrg(
        XElement root,
        string orgValue,
        string appValue,
        string action,
        IReadOnlySet<string>? taskScopeIds,
        IReadOnlySet<string>? endEventIds
    )
    {
        foreach (var rule in root.Elements().Where(e => e.Name.LocalName == "Rule"))
        {
            if (!string.Equals(rule.Attribute("Effect")?.Value, "Permit", StringComparison.OrdinalIgnoreCase))
                continue;

            // A Condition narrows the rule in ways we cannot evaluate statically.
            if (rule.Elements().Any(e => e.Name.LocalName == "Condition"))
                continue;

            var target = rule.Elements().FirstOrDefault(e => e.Name.LocalName == "Target");

            // Per XACML, a missing/empty Target applies to any request.
            bool applies =
                target is null
                || target
                    .Elements()
                    .Where(e => e.Name.LocalName == "AnyOf")
                    .All(anyOf =>
                        anyOf
                            .Elements()
                            .Where(e => e.Name.LocalName == "AllOf")
                            .Any(allOf =>
                                allOf
                                    .Elements()
                                    .Where(e => e.Name.LocalName == "Match")
                                    .All(m => MatchSatisfied(m, orgValue, appValue, action, taskScopeIds, endEventIds))
                            )
                    );

            if (applies)
                return true;
        }

        return false;
    }

    /// <summary>
    /// Whether a single Match is satisfied by the simulated engine request: the org as subject,
    /// this app as the resource, and <paramref name="action"/> as the action. Matches on attributes
    /// the request does not carry (roles, party types, custom attributes, ...) are unsatisfied, so a
    /// rule constrained by them is conservatively not counted as a grant.
    /// </summary>
    private static bool MatchSatisfied(
        XElement match,
        string orgValue,
        string appValue,
        string action,
        IReadOnlySet<string>? taskScopeIds,
        IReadOnlySet<string>? endEventIds
    )
    {
        var designator = match.Elements().FirstOrDefault(e => e.Name.LocalName == "AttributeDesignator");
        var attributeId = designator?.Attribute("AttributeId")?.Value;
        var category = designator?.Attribute("Category")?.Value;
        if (attributeId is null || category is null)
            return false;

        bool ValueIs(string expected) => string.Equals(MatchValue(match), expected, StringComparison.OrdinalIgnoreCase);

        return (category, attributeId) switch
        {
            (SubjectCategory, OrgAttributeId) => ValueIs(orgValue),
            (ResourceCategory, OrgAttributeId) => ValueIs(orgValue),
            (ResourceCategory, AppAttributeId) => ValueIs(appValue),
            (ActionCategory, ActionAttributeId) => ValueIs(action),
            // A task constraint is satisfied only when task-scoped grants are acceptable for this
            // check and the Match names one of the tasks the action can be performed in. A grant
            // scoped to a task id that does not exist in the process (e.g. after a rename) never
            // matches an actual request.
            (ResourceCategory, TaskAttributeId) => taskScopeIds is not null
                && MatchValue(match) is { } taskId
                && taskScopeIds.Contains(taskId),
            // 'complete' only happens at an end event, so end-event scoping does not narrow it -
            // but only when the Match names an end event the process actually has.
            (ResourceCategory, EndEventAttributeId) => string.Equals(
                action,
                "complete",
                StringComparison.OrdinalIgnoreCase
            )
                && endEventIds is not null
                && MatchValue(match) is { } endEventId
                && endEventIds.Contains(endEventId),
            _ => false,
        };
    }

    private static bool MatchTargets(XElement match, string attributeId, string category)
    {
        var designator = match.Elements().FirstOrDefault(e => e.Name.LocalName == "AttributeDesignator");
        return designator?.Attribute("AttributeId")?.Value == attributeId
            && designator.Attribute("Category")?.Value == category;
    }

    private static string? MatchValue(XElement match) =>
        match.Elements().FirstOrDefault(e => e.Name.LocalName == "AttributeValue")?.Value;

    /// <summary>
    /// Builds the new rule and inserts it textually (before ObligationExpressions, or before the
    /// closing Policy tag) so the rest of the file keeps its exact formatting. Returns the updated
    /// document text, or null (with a warning) if the rule could not be inserted safely.
    /// </summary>
    private string? InsertOrgRule(
        string policyFile,
        string originalText,
        XElement root,
        string orgValue,
        string appValue,
        IReadOnlyList<string> actions
    )
    {
        var prefix = root.GetPrefixOfNamespace(root.Name.Namespace);
        var p = string.IsNullOrEmpty(prefix) ? "" : prefix + ":";
        var newline = originalText.Contains("\r\n", StringComparison.Ordinal) ? "\r\n" : "\n";

        var lines = originalText.Split('\n').Select(l => l.TrimEnd('\r')).ToList();
        var insertIndex = lines.FindIndex(l =>
        {
            var t = l.TrimStart();
            return t.StartsWith($"<{p}ObligationExpressions", StringComparison.Ordinal)
                || t.StartsWith($"</{p}Policy", StringComparison.Ordinal);
        });

        if (insertIndex < 0)
        {
            _warnings.Add(
                "Could not find an insertion point in policy.xml. Please grant the app owner the action(s) "
                    + $"[{string.Join(", ", actions)}] manually."
            );
            return null;
        }

        var ruleId = NextRuleId(root);
        var rule = BuildRuleXml(p, ruleId, orgValue, appValue, actions, indent: "  ", newline);
        lines.Insert(insertIndex, rule);
        var result = string.Join(newline, lines);

        XDocument parsed;
        try
        {
            parsed = XDocument.Parse(result);
        }
        catch (XmlException ex)
        {
            _warnings.Add(
                $"Inserting the service-owner rule into {Path.GetFileName(policyFile)} would produce invalid XML "
                    + $"({ex.Message}). Left the file unchanged - please grant the app owner the action(s) "
                    + $"[{string.Join(", ", actions)}] manually."
            );
            return null;
        }

        // A parse check alone is not enough: the textual insertion point can land inside a comment
        // or CDATA section (e.g. a commented-out <ObligationExpressions> block), where the rule text
        // is valid XML but dead content. Only accept the result if the rule is really a Rule element.
        var ruleWasInserted = parsed
            .Root?.Elements()
            .Any(e => e.Name.LocalName == "Rule" && e.Attribute("RuleId")?.Value == ruleId);
        if (ruleWasInserted != true)
        {
            _warnings.Add(
                $"Could not insert the service-owner rule into {Path.GetFileName(policyFile)} safely (the "
                    + "insertion point appears to be inside a comment or other non-element content). Left the "
                    + $"file unchanged - please grant the app owner the action(s) [{string.Join(", ", actions)}] "
                    + "manually."
            );
            return null;
        }

        return result;
    }

    /// <summary>
    /// Reuses the file's own rule id convention: one higher than the largest numeric
    /// <c>...ruleid:N</c> suffix found.
    /// </summary>
    private static string NextRuleId(XElement root)
    {
        var max = 0;
        var idPrefix = "urn:altinn:example:ruleid";
        foreach (var rule in root.Elements().Where(e => e.Name.LocalName == "Rule"))
        {
            var id = rule.Attribute("RuleId")?.Value;
            if (id is null)
                continue;

            var match = Regex.Match(id, @"^(?<prefix>.*ruleid):(?<num>\d+)$");
            if (match.Success && int.TryParse(match.Groups["num"].Value, out var n) && n > max)
            {
                max = n;
                idPrefix = match.Groups["prefix"].Value;
            }
        }

        return $"{idPrefix}:{max + 1}";
    }

    private static string BuildRuleXml(
        string p,
        string ruleId,
        string org,
        string app,
        IReadOnlyList<string> actions,
        string indent,
        string newline
    )
    {
        const string stringDataType = "http://www.w3.org/2001/XMLSchema#string";
        const string equal = "urn:oasis:names:tc:xacml:1.0:function:string-equal";
        const string equalIgnoreCase = "urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case";

        var sb = new StringBuilder();
        void Line(int depth, string s)
        {
            for (var i = 0; i < depth; i++)
                sb.Append(indent);
            sb.Append(s).Append(newline);
        }

        void Match(int depth, string matchId, string value, string attributeId, string category)
        {
            Line(depth, $"<{p}Match MatchId=\"{matchId}\">");
            Line(depth + 1, $"<{p}AttributeValue DataType=\"{stringDataType}\">{value}</{p}AttributeValue>");
            Line(
                depth + 1,
                $"<{p}AttributeDesignator AttributeId=\"{attributeId}\" Category=\"{category}\" "
                    + $"DataType=\"{stringDataType}\" MustBePresent=\"false\"/>"
            );
            Line(depth, $"</{p}Match>");
        }

        Line(1, $"<{p}Rule RuleId=\"{ruleId}\" Effect=\"Permit\">");
        Line(
            2,
            $"<{p}Description>Rule added by the v8 to v9 upgrade: gives the app owner {org} the right to "
                + $"{string.Join(", ", actions)} instances of {org}/{app} in any process state. The v9 workflow "
                + "engine persists process-state transitions to Storage out-of-band as the service owner rather "
                + $"than in-app as the current user.</{p}Description>"
        );
        Line(2, $"<{p}Target>");

        Line(3, $"<{p}AnyOf>");
        Line(4, $"<{p}AllOf>");
        Match(5, equalIgnoreCase, org, OrgAttributeId, SubjectCategory);
        Line(4, $"</{p}AllOf>");
        Line(3, $"</{p}AnyOf>");

        Line(3, $"<{p}AnyOf>");
        Line(4, $"<{p}AllOf>");
        Match(5, equal, org, OrgAttributeId, ResourceCategory);
        Match(5, equal, app, AppAttributeId, ResourceCategory);
        Line(4, $"</{p}AllOf>");
        Line(3, $"</{p}AnyOf>");

        Line(3, $"<{p}AnyOf>");
        foreach (var action in actions)
        {
            Line(4, $"<{p}AllOf>");
            Match(5, equalIgnoreCase, action, ActionAttributeId, ActionCategory);
            Line(4, $"</{p}AllOf>");
        }
        Line(3, $"</{p}AnyOf>");

        Line(2, $"</{p}Target>");
        sb.Append(indent).Append("</").Append(p).Append("Rule>");

        return sb.ToString();
    }

    /// <summary>
    /// Warns about task-specific actions (confirm, sign, pay, or the custom task-type name) whose
    /// transitions the engine replays with a dedicated action but the policy does not grant the org.
    /// Grants scoped to the task(s) of the relevant type count here, since these transitions happen
    /// inside those tasks.
    /// </summary>
    private void WarnAboutTaskSpecificActions(
        XElement policyRoot,
        string orgValue,
        string appValue,
        ProcessInfo? processInfo
    )
    {
        if (processInfo is null)
            return;

        var missing = processInfo
            .TaskSpecificActions.Where(a =>
                !IsActionGrantedToOrg(
                    policyRoot,
                    orgValue,
                    appValue,
                    a.Action,
                    taskScopeIds: a.TaskIds,
                    endEventIds: null
                )
            )
            .ToList();

        if (missing.Count > 0)
        {
            _manualActionRequired = true;
            _warnings.Add(
                "The process contains task types whose transitions the v9 workflow engine replays with a "
                    + "dedicated action, and the policy does not grant the app owner these: "
                    + string.Join(
                        ", ",
                        missing.Select(m => $"'{m.Action}' (from {string.Join("/", m.TaskTypes)} task)")
                    )
                    + ". Grant them to the org subject in policy.xml, or those tasks will fail to advance."
            );
        }
    }

    /// <summary>Whether the policy contains any rule with Effect="Deny".</summary>
    private static bool HasDenyRules(XElement root) =>
        root.Elements()
            .Any(e =>
                e.Name.LocalName == "Rule"
                && string.Equals(e.Attribute("Effect")?.Value, "Deny", StringComparison.OrdinalIgnoreCase)
            );

    /// <summary>Whether any Match in the policy scopes by task or end event.</summary>
    private static bool PolicyScopesByTaskOrEndEvent(XElement root) =>
        root.Descendants()
            .Where(e => e.Name.LocalName == "Match")
            .Any(m =>
                MatchTargets(m, TaskAttributeId, ResourceCategory)
                || MatchTargets(m, EndEventAttributeId, ResourceCategory)
            );

    /// <summary>
    /// Loads the facts about the process that the grant evaluation needs: the end-event ids (to
    /// verify end-event-scoped 'complete' grants against real end events) and, per task-specific
    /// action, which task type(s) and task id(s) need it. Returns null when the process file is
    /// missing or unreadable.
    /// </summary>
    private ProcessInfo? TryLoadProcessInfo()
    {
        var processFile = AppFiles.Resolve(_projectFolder, "config/process/process.bpmn");
        if (processFile is null)
            return null;

        XDocument processDoc;
        try
        {
            processDoc = XDocument.Parse(Utf8TextFile.Decode(File.ReadAllBytes(processFile)).Text);
        }
        catch (Exception ex) when (ex is XmlException or DecoderFallbackException)
        {
            return null;
        }

        var endEventIds = processDoc
            .Descendants()
            .Where(e => e.Name.LocalName == "endEvent")
            .Select(e => e.Attribute("id")?.Value)
            .OfType<string>()
            .ToHashSet(StringComparer.Ordinal);

        var actions = new Dictionary<string, (HashSet<string> TaskTypes, HashSet<string> TaskIds)>(
            StringComparer.OrdinalIgnoreCase
        );
        foreach (var taskType in processDoc.Descendants().Where(e => e.Name.LocalName == "taskType"))
        {
            var type = taskType.Value.Trim();
            if (type.Length == 0 || _taskTypesCoveredByWrite.Contains(type, StringComparer.OrdinalIgnoreCase))
                continue;

            // The taskType extension element lives inside the task element, which carries the id.
            var taskId = taskType
                .Ancestors()
                .FirstOrDefault(a => a.Attribute("id") is not null)
                ?.Attribute("id")
                ?.Value;

            // Matches ProcessEngineAuthorizer.GetActionsThatAllowProcessNextForTaskType in
            // app-lib-dotnet: confirmation advances with 'confirm' only; signing also uses 'reject'.
            string[] needed = type switch
            {
                "confirmation" => ["confirm"],
                "signing" => ["sign", "reject"],
                "payment" => ["pay"],
                _ => [type],
            };

            foreach (var action in needed)
            {
                if (!actions.TryGetValue(action, out var entry))
                {
                    entry = (new HashSet<string>(StringComparer.Ordinal), new HashSet<string>(StringComparer.Ordinal));
                    actions[action] = entry;
                }

                entry.TaskTypes.Add(type);
                if (taskId is not null)
                    entry.TaskIds.Add(taskId);
            }
        }

        return new ProcessInfo(
            endEventIds,
            actions.Select(kvp => new TaskSpecificAction(kvp.Key, kvp.Value.TaskTypes, kvp.Value.TaskIds)).ToList()
        );
    }

    /// <summary>A task-specific action the org needs, with the task type(s) and task id(s) that need it.</summary>
    private sealed record TaskSpecificAction(
        string Action,
        IReadOnlySet<string> TaskTypes,
        IReadOnlySet<string> TaskIds
    );

    /// <summary>Facts from process.bpmn needed to evaluate task- and end-event-scoped grants.</summary>
    private sealed record ProcessInfo(
        IReadOnlySet<string> EndEventIds,
        IReadOnlyList<TaskSpecificAction> TaskSpecificActions
    );
}
