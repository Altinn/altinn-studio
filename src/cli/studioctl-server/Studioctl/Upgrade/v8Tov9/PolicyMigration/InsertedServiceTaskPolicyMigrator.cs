using System.Text;
using System.Text.RegularExpressions;
using System.Xml;
using System.Xml.Linq;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.PolicyMigration;

/// <summary>
/// Gives users read and write on the service tasks the upgrade inserted after a task
/// (<c>PdfTask_{T}</c>, <c>EFormidlingTask_{T}</c>) when the policy grants them those actions only in
/// task <c>T</c>.
///
/// While an instance is in a service task, the app authorizes users against that task's id: reading
/// the instance needs <c>read</c>, and retrying a failed service task needs <c>write</c>. A rule scoped
/// to <c>urn:altinn:task</c> = <c>T</c> does not match <c>PdfTask_{T}</c>. Per action, a Permit rule
/// that grants it to users for the whole app covers it, and nothing is added. Otherwise each
/// task-scoped rule that grants it gets a new rule giving its subjects only the uncovered actions on
/// the inserted tasks: the app runs any action handler the user is authorized for in the current
/// task, so no other action is copied.
/// </summary>
internal sealed class InsertedServiceTaskPolicyMigrator
{
    private const string SubjectCategory = "urn:oasis:names:tc:xacml:1.0:subject-category:access-subject";
    private const string ResourceCategory = "urn:oasis:names:tc:xacml:3.0:attribute-category:resource";
    private const string ActionCategory = "urn:oasis:names:tc:xacml:3.0:attribute-category:action";
    private const string ActionAttributeId = "urn:oasis:names:tc:xacml:1.0:action:action-id";
    private const string OrgAttributeId = "urn:altinn:org";
    private const string AppAttributeId = "urn:altinn:app";
    private const string TaskAttributeId = "urn:altinn:task";
    private const string StringDataType = "http://www.w3.org/2001/XMLSchema#string";

    /// <summary>
    /// The actions a user needs while an instance is in a service task: <c>read</c> to see the
    /// instance, <c>write</c> to retry the task when it fails.
    /// </summary>
    private static readonly string[] _serviceTaskActions = ["read", "write"];

    /// <summary>
    /// The id prefixes and task types of the service tasks the upgrade inserts after a task.
    /// </summary>
    private static readonly (string IdPrefix, string TaskType)[] _insertedServiceTasks =
    [
        ("PdfTask_", "pdf"),
        ("EFormidlingTask_", "eFormidling"),
    ];

    private readonly string _projectFolder;
    private readonly List<UpgradeMessage> _messages = new();

    public InsertedServiceTaskPolicyMigrator(string projectFolder)
    {
        _projectFolder = projectFolder;
    }

    /// <summary>
    /// Runs the migration. The result carries a warning naming the rules added, or a to-do when the
    /// policy needs extending but could not be changed safely. No messages means nothing needed
    /// extending.
    /// </summary>
    public async Task<MigrationResult> Migrate()
    {
        var insertedTasks = FindInsertedServiceTasks();
        if (insertedTasks.Count == 0)
            return Result();

        var policyFile = AppFiles.Resolve(_projectFolder, "config/authorization/policy.xml");
        if (policyFile is null)
        {
            _messages.Warn("Could not find config/authorization/policy.xml; skipped extending user rules.");
            return Result();
        }

        string text;
        bool hadBom;
        XElement? root;
        try
        {
            (text, hadBom) = Utf8TextFile.Decode(await File.ReadAllBytesAsync(policyFile));
            root = XDocument.Parse(text).Root;
        }
        catch (Exception ex) when (ex is DecoderFallbackException or XmlException)
        {
            _messages.Todo(
                $"Could not read {Path.GetFileName(policyFile)} as UTF-8 XML; skipped extending user rules to "
                    + "the inserted service tasks."
            );
            return Result();
        }

        // Only a policy that scopes rules to a task with inserted service tasks can need extending.
        var scopedAnchors = insertedTasks
            .Keys.Where(anchor =>
                root?.Descendants()
                    .Any(e =>
                        e.Name.LocalName == "Match" && AttributeIdOf(e) == TaskAttributeId && MatchValue(e) == anchor
                    ) == true
            )
            .ToList();
        if (root is null || root.Name.LocalName != "Policy" || scopedAnchors.Count == 0)
            return Result();

        var (problem, extensions) = Analyze(root, insertedTasks);
        if (problem is null && extensions.Count == 0)
            return Result();

        var updatedText = problem is null ? InsertRules(text, root, extensions, insertedTasks) : null;
        if (updatedText is null)
        {
            _messages.Todo(
                $"{problem ?? "Could not add the rules to policy.xml safely."} Left policy.xml unchanged. Give "
                    + "users who can read or write in a task the same actions on the service tasks inserted "
                    + "after it: "
                    + string.Join("; ", scopedAnchors.Select(a => $"{a} -> {string.Join(", ", insertedTasks[a])}"))
                    + "."
            );
            return Result();
        }

        await Utf8TextFile.Write(policyFile, updatedText, withBom: hadBom);
        var added = extensions.Select(e =>
            $"added rule {e.RuleId} giving the subjects of rule {e.Rule.Label} {string.Join(", ", e.Actions)} on "
            + string.Join(", ", e.Targets.Select(t => t.TaskId))
        );
        _messages.Warn(
            "Gave users read/write on the service tasks the upgrade inserted, where policy.xml grants them "
                + $"only per task: {string.Join("; ", added)}. Please review the new rules."
        );
        return Result();
    }

    private MigrationResult Result() => new(_messages);

    /// <summary>
    /// Maps each task in process.bpmn to the ids of the service tasks the upgrade inserted after it.
    /// A missing or unreadable process gives no entries.
    /// </summary>
    private Dictionary<string, IReadOnlyList<string>> FindInsertedServiceTasks()
    {
        var result = new Dictionary<string, IReadOnlyList<string>>(StringComparer.Ordinal);
        var processFile = AppFiles.Resolve(_projectFolder, "config/process/process.bpmn");
        if (processFile is null)
            return result;

        XDocument processDoc;
        try
        {
            processDoc = XDocument.Parse(Utf8TextFile.Decode(File.ReadAllBytes(processFile)).Text);
        }
        catch (Exception ex) when (ex is XmlException or DecoderFallbackException)
        {
            return result;
        }

        foreach (var process in processDoc.Root?.Elements().Where(e => e.Name.LocalName == "process") ?? [])
        {
            var tasks = process
                .Elements()
                .Where(e => e.Name.LocalName.EndsWith("task", StringComparison.OrdinalIgnoreCase))
                .ToList();

            foreach (var anchorId in tasks.Select(t => t.Attribute("id")?.Value).OfType<string>())
            {
                var inserted = _insertedServiceTasks
                    .Where(s =>
                        tasks.Exists(t =>
                            t.Name.LocalName == "serviceTask"
                            && t.Attribute("id")?.Value == s.IdPrefix + anchorId
                            && t.Descendants().FirstOrDefault(e => e.Name.LocalName == "taskType")?.Value.Trim()
                                == s.TaskType
                        )
                    )
                    .Select(s => s.IdPrefix + anchorId)
                    .ToList();

                if (inserted.Count > 0)
                    result[anchorId] = inserted;
            }
        }

        return result;
    }

    /// <summary>
    /// Works out which rules to extend. Returns a problem instead when the policy has a shape whose
    /// effect cannot be judged statically: Deny rules, Conditions, or a read/write rule whose Target
    /// this migration does not understand.
    /// </summary>
    private static (string? Problem, List<Extension> Extensions) Analyze(
        XElement root,
        IReadOnlyDictionary<string, IReadOnlyList<string>> insertedTasks
    )
    {
        var ruleElements = root.Elements().Where(e => e.Name.LocalName == "Rule").ToList();
        if (
            ruleElements.Exists(r =>
                !string.Equals(r.Attribute("Effect")?.Value, "Permit", StringComparison.OrdinalIgnoreCase)
            )
        )
            return ("policy.xml contains Deny rules, which this step cannot evaluate.", []);
        if (ruleElements.Exists(r => r.Elements().Any(e => e.Name.LocalName == "Condition")))
            return ("policy.xml contains a rule with a Condition, which this step cannot evaluate.", []);

        var rules = new List<RuleShape>();
        for (var i = 0; i < ruleElements.Count; i++)
        {
            var label = ruleElements[i].Attribute("RuleId")?.Value ?? $"#{i + 1}";
            var (shape, problem) = RuleShape.Parse(ruleElements[i], label);
            if (problem is not null)
                return (problem, []);
            if (shape is not null)
                rules.Add(shape);
        }

        var uncovered = _serviceTaskActions
            .Where(action => !rules.Exists(r => r.GrantsToUsers && r.IsAppLevel && r.Grants(action)))
            .ToList();

        var extensions = new List<Extension>();
        foreach (var rule in rules.Where(r => r.GrantsToUsers))
        {
            var actions = uncovered.Where(rule.Grants).ToList();
            bool AlreadyGranted(string taskId) =>
                actions.TrueForAll(a =>
                    rules.Exists(other =>
                        other.Grants(a)
                        && other.TaskAllOfs.Exists(o => o.TaskId == taskId)
                        && other.HasSameSubjects(rule)
                    )
                );

            var targets = rule
                .TaskAllOfs.Where(t => insertedTasks.ContainsKey(t.TaskId))
                .SelectMany(t => insertedTasks[t.TaskId].Select(id => (t.AllOf, TaskId: id)))
                .Where(t => !AlreadyGranted(t.TaskId))
                .ToList();

            if (actions.Count > 0 && targets.Count > 0)
                extensions.Add(new Extension(rule, targets, actions));
        }

        return (null, extensions);
    }

    /// <summary>
    /// Builds a rule per extension and inserts them textually (before ObligationExpressions, or before
    /// the closing Policy tag) so the rest of the file keeps its exact formatting. Returns null when the
    /// result is not a policy that holds the new rules and needs nothing more.
    /// </summary>
    private static string? InsertRules(
        string originalText,
        XElement root,
        List<Extension> extensions,
        IReadOnlyDictionary<string, IReadOnlyList<string>> insertedTasks
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
            return null;

        var (idPrefix, nextNumber) = NextRuleId(root);
        foreach (var extension in extensions)
        {
            extension.RuleId = $"{idPrefix}:{nextNumber++}";
        }
        lines.Insert(insertIndex, BuildRulesXml(root, extensions, newline));
        var result = string.Join(newline, lines);

        XElement? updatedRoot;
        try
        {
            updatedRoot = XDocument.Parse(result).Root;
        }
        catch (XmlException)
        {
            return null;
        }

        // A parse check alone is not enough: the insertion point can be inside a comment, where the rules
        // are valid XML but dead content. Only accept the result if they are real Rule elements.
        if (updatedRoot is null)
            return null;
        var ruleIds = updatedRoot
            .Elements()
            .Where(e => e.Name.LocalName == "Rule")
            .Select(e => e.Attribute("RuleId")?.Value)
            .ToList();
        var complete =
            extensions.TrueForAll(e => ruleIds.Contains(e.RuleId))
            && Analyze(updatedRoot, insertedTasks) is { Problem: null, Extensions.Count: 0 };
        return complete ? result : null;
    }

    /// <summary>
    /// The file's own rule id convention: its prefix, and one higher than the largest numeric
    /// <c>...ruleid:N</c> suffix found.
    /// </summary>
    private static (string Prefix, int Next) NextRuleId(XElement root)
    {
        var max = 0;
        var idPrefix = "urn:altinn:example:ruleid";
        foreach (var rule in root.Elements().Where(e => e.Name.LocalName == "Rule"))
        {
            var match = Regex.Match(rule.Attribute("RuleId")?.Value ?? "", @"^(?<prefix>.*ruleid):(?<num>\d+)$");
            if (match.Success && int.TryParse(match.Groups["num"].Value, out var n) && n > max)
            {
                max = n;
                idPrefix = match.Groups["prefix"].Value;
            }
        }

        return (idPrefix, max + 1);
    }

    /// <summary>
    /// Writes the new rules, indented as rules in the policy are. Each copies the subjects of the rule it
    /// extends, and takes the org and app values from its task resource, so <c>[ORG]</c>/<c>[APP]</c>
    /// placeholders survive.
    /// </summary>
    private static string BuildRulesXml(XElement root, IEnumerable<Extension> extensions, string newline)
    {
        const string equal = "urn:oasis:names:tc:xacml:1.0:function:string-equal";
        const string equalIgnoreCase = "urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case";
        var ns = root.Name.Namespace;
        var prefix = root.GetPrefixOfNamespace(ns);

        XElement Match(string matchId, string value, string attributeId, string category) =>
            new(
                ns + "Match",
                new XAttribute("MatchId", matchId),
                new XElement(ns + "AttributeValue", new XAttribute("DataType", StringDataType), value),
                new XElement(
                    ns + "AttributeDesignator",
                    new XAttribute("AttributeId", attributeId),
                    new XAttribute("Category", category),
                    new XAttribute("DataType", StringDataType),
                    new XAttribute("MustBePresent", "false")
                )
            );

        XElement Resource(XElement source, string attributeId) =>
            Match(
                equal,
                MatchValue(ChildrenNamed(source, "Match").First(m => AttributeIdOf(m) == attributeId)) ?? "",
                attributeId,
                ResourceCategory
            );

        // Written inside a copy of the Policy element, so the rules use its namespace prefix and sit
        // one level in; the copy's own start and end lines are dropped.
        var policy = new XElement(
            root.Name,
            new XAttribute(string.IsNullOrEmpty(prefix) ? "xmlns" : XNamespace.Xmlns + prefix, ns.NamespaceName),
            extensions.Select(e => new XElement(
                ns + "Rule",
                new XAttribute("RuleId", e.RuleId),
                new XAttribute("Effect", "Permit"),
                new XElement(
                    ns + "Description",
                    $"Rule added by the v8 to v9 upgrade: gives the subjects of rule {e.Rule.Label} the right to "
                        + $"{string.Join(", ", e.Actions)} in the service tasks the upgrade inserted after a task "
                        + "that rule covers."
                ),
                new XElement(
                    ns + "Target",
                    e.Rule.SubjectAnyOfs.Select(anyOf => new XElement(anyOf)),
                    new XElement(
                        ns + "AnyOf",
                        e.Targets.Select(t => new XElement(
                            ns + "AllOf",
                            Resource(t.AllOf, OrgAttributeId),
                            Resource(t.AllOf, AppAttributeId),
                            Match(equal, t.TaskId, TaskAttributeId, ResourceCategory)
                        ))
                    ),
                    new XElement(
                        ns + "AnyOf",
                        e.Actions.Select(a => new XElement(
                            ns + "AllOf",
                            Match(equalIgnoreCase, a, ActionAttributeId, ActionCategory)
                        ))
                    )
                )
            ))
        );

        var sb = new StringBuilder();
        var settings = new XmlWriterSettings
        {
            OmitXmlDeclaration = true,
            Indent = true,
            IndentChars = "  ",
            NewLineChars = newline,
        };
        using (var writer = XmlWriter.Create(sb, settings))
        {
            policy.WriteTo(writer);
        }

        var lines = sb.ToString().Split(newline);
        return string.Join(newline, lines[1..^1]);
    }

    private static string? AttributeIdOf(XElement match) =>
        ChildrenNamed(match, "AttributeDesignator").FirstOrDefault()?.Attribute("AttributeId")?.Value;

    private static string? MatchValue(XElement match) => ChildrenNamed(match, "AttributeValue").FirstOrDefault()?.Value;

    private static IEnumerable<XElement> ChildrenNamed(XElement element, string localName) =>
        element.Elements().Where(e => e.Name.LocalName == localName);

    /// <summary>A read/write rule broken down into who it grants, where, and what.</summary>
    private sealed record RuleShape(
        string Label,
        IReadOnlyList<XElement> SubjectAnyOfs,
        IReadOnlySet<string>? Actions,
        bool IsAppLevel,
        List<(XElement AllOf, string TaskId)> TaskAllOfs
    )
    {
        /// <summary>
        /// Whether the rule grants anyone besides a service owner. An AllOf that matches only the
        /// subject's <c>urn:altinn:org</c> stands for a service owner; every other subject is a user.
        /// </summary>
        public bool GrantsToUsers =>
            SubjectAnyOfs.All(anyOf =>
                ChildrenNamed(anyOf, "AllOf")
                    .Any(allOf => !ChildrenNamed(allOf, "Match").All(m => AttributeIdOf(m) == OrgAttributeId))
            );

        /// <summary>Whether the rule grants exactly the subjects of <paramref name="other"/>.</summary>
        public bool HasSameSubjects(RuleShape other) =>
            SubjectAnyOfs.Count == other.SubjectAnyOfs.Count
            && SubjectAnyOfs.Zip(other.SubjectAnyOfs).All(pair => XNode.DeepEquals(pair.First, pair.Second));

        public bool Grants(string action) => Actions is null || Actions.Contains(action);

        private static string? CategoryOf(XElement match) =>
            ChildrenNamed(match, "AttributeDesignator").FirstOrDefault()?.Attribute("Category")?.Value;

        /// <summary>
        /// Reads a rule that can grant read or write as subject, resource and action AnyOfs. Returns no
        /// shape for any other rule, and a problem for a shape whose grants cannot be judged.
        /// </summary>
        public static (RuleShape? Shape, string? Problem) Parse(XElement rule, string label)
        {
            var actionMatches = rule.Descendants()
                .Where(e => e.Name.LocalName == "Match" && CategoryOf(e) == ActionCategory)
                .ToList();
            if (
                actionMatches.Count > 0
                && !actionMatches.Exists(m =>
                    _serviceTaskActions.Contains(MatchValue(m)?.Trim(), StringComparer.OrdinalIgnoreCase)
                )
            )
                return (null, null);

            var subjects = new List<XElement>();
            XElement? resource = null;
            HashSet<string>? actions = null;
            var problem = $"Rule {label} has a Target this step cannot evaluate.";

            foreach (var anyOf in ChildrenNamed(rule, "Target").SelectMany(t => ChildrenNamed(t, "AnyOf")))
            {
                var allOfs = ChildrenNamed(anyOf, "AllOf").Select(a => ChildrenNamed(a, "Match").ToList()).ToList();
                if (allOfs.Count == 0 || allOfs.Exists(matches => matches.Count == 0))
                    return (null, problem);

                switch (allOfs.SelectMany(matches => matches).Select(CategoryOf).Distinct().ToList())
                {
                    case [SubjectCategory]:
                        subjects.Add(anyOf);
                        break;
                    case [ResourceCategory] when resource is null:
                        resource = anyOf;
                        break;
                    case [ActionCategory] when actions is null:
                        if (allOfs.Exists(m => m is not [var single] || AttributeIdOf(single) != ActionAttributeId))
                            return (null, problem);
                        actions = allOfs
                            .Select(m => MatchValue(m[0])?.Trim() ?? "")
                            .ToHashSet(StringComparer.OrdinalIgnoreCase);
                        break;
                    default:
                        return (null, problem);
                }
            }

            var isAppLevel = resource is null;
            var taskAllOfs = new List<(XElement, string)>();
            foreach (var allOf in resource is null ? [] : ChildrenNamed(resource, "AllOf"))
            {
                var attributes = ChildrenNamed(allOf, "Match").Select(AttributeIdOf).ToList();
                var orgAndApp =
                    attributes.Count(a => a == OrgAttributeId) == 1 && attributes.Count(a => a == AppAttributeId) == 1;
                if (attributes is [_, _] && orgAndApp)
                {
                    isAppLevel = true;
                }
                else if (attributes.Contains(TaskAttributeId))
                {
                    if (attributes is not [_, _, _] || !orgAndApp)
                        return (null, $"Rule {label} scopes a task outside an org and app resource.");
                    var task = ChildrenNamed(allOf, "Match").First(m => AttributeIdOf(m) == TaskAttributeId);
                    taskAllOfs.Add((allOf, MatchValue(task) ?? ""));
                }
            }

            return (new RuleShape(label, subjects, actions, isAppLevel, taskAllOfs), null);
        }
    }

    /// <summary>A rule to add: the rule it extends, the inserted tasks it covers and the actions it grants.</summary>
    private sealed record Extension(
        RuleShape Rule,
        List<(XElement AllOf, string TaskId)> Targets,
        IReadOnlyList<string> Actions
    )
    {
        /// <summary>The id of the added rule, set when it is inserted.</summary>
        public string RuleId { get; set; } = "";
    }
}
