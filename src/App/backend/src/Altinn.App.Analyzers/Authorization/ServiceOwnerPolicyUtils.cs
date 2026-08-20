using System.Xml;
using Altinn.App.Analyzers.Utils;
using NanoJsonReader;

namespace Altinn.App.Analyzers.Authorization;

/// <summary>
/// Checks that the app's XACML policy permits the app owner (org) everything the app does as the
/// service owner. See <see cref="ServiceOwnerActions"/> for what that is and why.
/// </summary>
internal static class ServiceOwnerPolicyUtils
{
    private const string PolicyPath = "config/authorization/policy.xml";
    private const string ProcessPath = "config/process/process.bpmn";

    private const string InconclusiveRule =
        "the policy grants it only through a rule this analysis cannot decide statically (a condition, "
        + "a grant scoped to a single task, or an attribute or match function it does not model)";

    internal static bool IsPolicyFile(AdditionalText text) => HasPath(text, PolicyPath);

    internal static bool IsProcessFile(AdditionalText text) => HasPath(text, ProcessPath);

    private static bool HasPath(AdditionalText text, string suffix) =>
        text.Path.Replace('\\', '/').EndsWith(suffix, StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Appends a diagnostic for every action the app owner needs but the policy does not grant
    /// (<see cref="Diagnostics.Authorization.MissingServiceOwnerGrant"/>), or one warning when the
    /// policy cannot be evaluated at all
    /// (<see cref="Diagnostics.Authorization.ServiceOwnerGrantNotVerifiable"/>).
    /// </summary>
    /// <param name="policyFile">config/authorization/policy.xml, or null when the app has none.</param>
    /// <param name="processFile">config/process/process.bpmn, or null when the app has none.</param>
    /// <param name="metadataFile">config/applicationmetadata.json, or null when the app has none.</param>
    /// <param name="token">Cancellation for the file reads.</param>
    /// <param name="diagnostics">Collects the diagnostics to report.</param>
    internal static void CollectPolicyDiagnostics(
        AdditionalText? policyFile,
        AdditionalText? processFile,
        AdditionalText? metadataFile,
        CancellationToken token,
        List<Diagnostic> diagnostics
    )
    {
        var (metadataOrg, metadataApp, autoDeleteOnProcessEnd) = ReadMetadata(metadataFile, token);

        // Without a process there is nothing to derive task-specific requirements from, but the
        // baseline still applies - every app reads and writes instance data.
        var processContent = processFile?.GetText(token)?.ToString();
        var process = processContent is null ? null : ProcessInfo.TryParse(processContent);
        var requirements = BuildRequirements(process, autoDeleteOnProcessEnd);

        if (policyFile is null)
        {
            // Nothing to anchor a location to, and nothing to evaluate.
            return;
        }

        var policyContent = policyFile.GetText(token)?.ToString();
        var policy = policyContent is null ? null : XacmlPolicy.TryParse(policyContent);
        if (policy is null || policyContent is null)
        {
            var (fallbackOrg, fallbackApp) = (
                metadataOrg ?? XacmlPolicy.OrgPlaceholder,
                metadataApp ?? XacmlPolicy.AppPlaceholder
            );
            diagnostics.Add(
                NotVerifiable(
                    FileLocationHelper.GetLocation(policyFile, 0, null),
                    fallbackOrg,
                    fallbackApp,
                    AllActions(requirements),
                    "policy.xml could not be read as an XACML policy document"
                )
            );
            return;
        }

        var (org, app) = policy.ResolveOrgAndApp(metadataOrg, metadataApp);
        var location = PolicyLocation(policyFile, policyContent, policy);

        if (policy.HasDenyRules)
        {
            // With a deny-overrides combining algorithm a Permit found here can still be overridden,
            // so no per-action verdict is trustworthy.
            diagnostics.Add(
                NotVerifiable(
                    location,
                    org,
                    app,
                    AllActions(requirements),
                    "policy.xml contains Deny rules, whose effect on the app owner this analysis cannot evaluate"
                )
            );
            return;
        }

        if (processFile is not null && process is null)
        {
            diagnostics.Add(
                NotVerifiable(
                    location,
                    org,
                    app,
                    AllActions(requirements),
                    "process.bpmn could not be parsed, so the actions the process needs could not be determined"
                )
            );
        }

        var endEventIds = process?.EndEventIds;
        foreach (var requirement in requirements)
        {
            var result = policy.Evaluate(org, app, requirement.AnyOfActions, requirement.TaskScope, endEventIds);
            switch (result)
            {
                case GrantResult.Missing:
                    diagnostics.Add(
                        Diagnostic.Create(
                            Diagnostics.Authorization.MissingServiceOwnerGrant,
                            location,
                            org,
                            Format(requirement.AnyOfActions),
                            app,
                            requirement.Reason
                        )
                    );
                    break;
                case GrantResult.Inconclusive:
                    diagnostics.Add(
                        NotVerifiable(location, org, app, Format(requirement.AnyOfActions), InconclusiveRule)
                    );
                    break;
            }
        }
    }

    private static Diagnostic NotVerifiable(Location location, string org, string app, string actions, string reason) =>
        Diagnostic.Create(
            Diagnostics.Authorization.ServiceOwnerGrantNotVerifiable,
            location,
            org,
            actions,
            app,
            reason
        );

    /// <summary>
    /// The actions the app owner must hold, in a stable order: the unconditional baseline first,
    /// then the ones the process and the app metadata add.
    /// </summary>
    private static List<Requirement> BuildRequirements(ProcessInfo? process, bool autoDeleteOnProcessEnd)
    {
        var requirements = new List<Requirement>
        {
            new(ServiceOwnerActions.Read, TaskScope: null, "reads instance data"),
            new(ServiceOwnerActions.Write, TaskScope: null, "writes instance data and persists process transitions"),
        };

        var needsComplete = false;
        foreach (var task in process?.Tasks ?? [])
        {
            var scope = task.Id is null ? null : new HashSet<string>(StringComparer.Ordinal) { task.Id };
            var taskLabel = task.Id is null ? $"a '{task.TaskType}' task" : $"the '{task.TaskType}' task '{task.Id}'";

            if (!ServiceOwnerActions.IsCoveredByWrite(task.TaskType))
            {
                requirements.Add(
                    new Requirement(
                        ServiceOwnerActions.ProcessNextActionsForTaskType(task.TaskType),
                        scope,
                        $"advances {taskLabel}"
                    )
                );
            }

            if (task.AllowsReject)
            {
                requirements.Add(new Requirement(ServiceOwnerActions.Reject, scope, $"abandons {taskLabel} on reject"));
            }

            needsComplete |= ServiceOwnerActions.MarksInstanceComplete(task.TaskType);
        }

        if (needsComplete)
        {
            requirements.Add(
                new Requirement(
                    ServiceOwnerActions.Complete,
                    TaskScope: null,
                    "can mark the instance complete after shipping it to eFormidling or fiks arkiv"
                )
            );
        }

        if (autoDeleteOnProcessEnd)
        {
            requirements.Add(
                new Requirement(
                    ServiceOwnerActions.Delete,
                    TaskScope: null,
                    "deletes the instance at process end (autoDeleteOnProcessEnd)"
                )
            );
        }

        return Deduplicate(requirements);
    }

    /// <summary>
    /// Collapses requirements that ask the same question - several tasks of the same type, or a
    /// process with repeated confirmation tasks - keeping the first one's wording.
    /// </summary>
    private static List<Requirement> Deduplicate(List<Requirement> requirements)
    {
        var seen = new HashSet<string>(StringComparer.Ordinal);
        var result = new List<Requirement>(requirements.Count);
        foreach (var requirement in requirements)
        {
            var scope = requirement.TaskScope is null ? "" : string.Join(",", requirement.TaskScope.OrderBy(t => t));
            if (seen.Add($"{string.Join(",", requirement.AnyOfActions)}|{scope}"))
            {
                result.Add(requirement);
            }
        }

        return result;
    }

    private static string AllActions(List<Requirement> requirements) =>
        Format(requirements.SelectMany(r => r.AnyOfActions).Distinct(StringComparer.Ordinal).ToList());

    private static string Format(IReadOnlyList<string> actions) => string.Join(", ", actions);

    private static (string? Org, string? App, bool AutoDeleteOnProcessEnd) ReadMetadata(
        AdditionalText? metadataFile,
        CancellationToken token
    )
    {
        var content = metadataFile?.GetText(token)?.ToString();
        if (content is null)
        {
            return (null, null, false);
        }

        try
        {
            var metadata = JsonValue.Parse(content);
            if (metadata.Type != JsonType.Object)
            {
                // Structural errors are reported by the FormDataWrapperAnalyzer (ALTINNAPP0002).
                return (null, null, false);
            }

            var orgProperty = metadata.GetProperty("org");
            var org = orgProperty?.Type == JsonType.String ? orgProperty.GetString() : null;

            // "id" is "org/app", and also the fallback when the dedicated org field is missing.
            string? app = null;
            var idProperty = metadata.GetProperty("id");
            if (idProperty?.Type == JsonType.String && idProperty.GetString() is { } id)
            {
                var separator = id.IndexOf('/');
                if (separator > 0 && separator < id.Length - 1)
                {
                    org ??= id.Substring(0, separator);
                    app = id.Substring(separator + 1);
                }
            }

            var autoDelete = metadata.GetProperty("autoDeleteOnProcessEnd");
            return (
                string.IsNullOrWhiteSpace(org) ? null : org,
                string.IsNullOrWhiteSpace(app) ? null : app,
                autoDelete?.Type == JsonType.Boolean && autoDelete.GetBool()
            );
        }
        catch (NanoJsonException)
        {
            // Malformed JSON is reported by the FormDataWrapperAnalyzer (ALTINNAPP0002).
            return (null, null, false);
        }
    }

    /// <summary>
    /// Anchors the diagnostics on the policy's root element. The problem is an absent rule, so
    /// there is nothing narrower to point at, and the document element is where a reader starts.
    /// </summary>
    private static Location PolicyLocation(AdditionalText policyFile, string content, XacmlPolicy policy)
    {
        var lineInfo = policy.RootLineInfo;
        if (!lineInfo.HasLineInfo())
        {
            return FileLocationHelper.GetLocation(policyFile, 0, null);
        }

        var offset = OffsetOf(content, lineInfo.LineNumber, lineInfo.LinePosition);
        if (offset < 0)
        {
            return FileLocationHelper.GetLocation(policyFile, 0, null);
        }

        // The reported position is the element name, one character past the '<' that opens the tag.
        var start = Math.Max(0, offset - 1);
        var end = start;
        while (end < content.Length && content[end] != '>' && !char.IsWhiteSpace(content[end]))
        {
            end++;
        }

        return FileLocationHelper.GetLocation(policyFile, start, end);
    }

    /// <summary>Translates a 1-based <see cref="IXmlLineInfo"/> position into a character offset.</summary>
    private static int OffsetOf(string content, int lineNumber, int linePosition)
    {
        var line = 1;
        var index = 0;
        while (line < lineNumber && index < content.Length)
        {
            if (content[index] == '\n')
            {
                line++;
            }

            index++;
        }

        return line == lineNumber ? Math.Min(content.Length, index + linePosition - 1) : -1;
    }

    /// <param name="AnyOfActions">The app owner needs at least one of these.</param>
    /// <param name="TaskScope">
    /// The task(s) a grant may be scoped to and still cover this requirement, or null when the app
    /// needs the action in any process state.
    /// </param>
    /// <param name="Reason">What the app does as the service owner, phrased to follow "the app ...".</param>
    private sealed record Requirement(IReadOnlyList<string> AnyOfActions, HashSet<string>? TaskScope, string Reason);
}
