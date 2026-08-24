using System.Xml.Linq;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.ProcessAdvisories;

/// <summary>
/// Read-only advisory: flags <c>feedback</c> tasks that sit directly behind a service task in
/// process.bpmn (possibly through gateways). In v9 the process parks on a service task while its
/// work is pending and the frontend shows a waiting step automatically, so a trailing feedback
/// task is usually a leftover v8 waiting pattern that now adds a second gate only an authorized
/// out-of-band process/next can clear.
///
/// Deliberately never rewritten: removing a BPMN task is not mechanical (flows, policy rules, ui
/// folders and app code may reference it, and live instances may be parked on it), and the
/// pattern can be legitimate when the feedback task models a separate decision gate (e.g. a
/// service-owner review) rather than the service task's own outcome. Only the app team can tell
/// those apart. Runs after the PDF/eFormidling migrations so service tasks they insert are seen.
/// </summary>
internal sealed class FeedbackAfterServiceTaskAdvisor
{
    private readonly string _projectFolder;
    private static readonly XNamespace _altinnNs = "http://altinn.no/process";

    public FeedbackAfterServiceTaskAdvisor(string projectFolder)
    {
        _projectFolder = projectFolder;
    }

    /// <summary>
    /// Scans process.bpmn and returns one to-do per feedback task that follows a service task: each one
    /// names the task and what to weigh up. Never modifies anything - only the app team can decide.
    /// </summary>
    public MigrationResult Analyze()
    {
        var messages = new List<UpgradeMessage>();

        var processFile = AppFiles.Resolve(_projectFolder, "config/process/process.bpmn");
        if (processFile is null)
            return new MigrationResult(messages);

        // Strict decode, same as the process rewriters: refuse non-UTF-8 rather than misread it,
        // and strip the BOM XDocument.Parse rejects.
        var (text, _) = Utf8TextFile.Decode(File.ReadAllBytes(processFile));
        var doc = XDocument.Parse(text);

        foreach (var process in doc.Root?.Elements().Where(e => e.Name.LocalName == "process") ?? [])
        {
            AnalyzeProcess(process, messages);
        }

        return new MigrationResult(messages);
    }

    private static void AnalyzeProcess(XElement process, List<UpgradeMessage> messages)
    {
        var elementsById = new Dictionary<string, XElement>(StringComparer.Ordinal);
        foreach (var element in process.Elements())
        {
            if (element.Attribute("id")?.Value is { } id)
                elementsById[id] = element;
        }

        var flows = new List<(string Source, string Target)>();
        foreach (var flow in process.Elements().Where(e => e.Name.LocalName == "sequenceFlow"))
        {
            if (flow.Attribute("sourceRef")?.Value is { } source && flow.Attribute("targetRef")?.Value is { } target)
            {
                flows.Add((source, target));
            }
        }

        var feedbackTasks = process
            .Elements()
            .Where(e =>
                e.Name.LocalName == "task"
                && string.Equals(GetAltinnTaskType(e), "feedback", StringComparison.OrdinalIgnoreCase)
            )
            .Select(e => e.Attribute("id")?.Value)
            .OfType<string>();

        foreach (var feedbackTaskId in feedbackTasks)
        {
            foreach (var serviceTaskId in FindUpstreamServiceTasks(feedbackTaskId, elementsById, flows))
            {
                var serviceTaskType = elementsById.TryGetValue(serviceTaskId, out var serviceTask)
                    ? GetAltinnTaskType(serviceTask)
                    : null;

                // eFormidling is not a "may be redundant" case: in v8 the feedback task held the
                // instance while delivery was pending, and the Altinn Events reminder loop that
                // moved the process past it no longer exists. The v9 service task waits for the
                // delivery confirmation itself, so a trailing feedback task strands the instance.
                if (string.Equals(serviceTaskType, "eFormidling", StringComparison.OrdinalIgnoreCase))
                {
                    messages.Todo(
                        $"The feedback task '{feedbackTaskId}' follows the eFormidling service task "
                            + $"'{serviceTaskId}' and must be removed. It exists to hold the instance while the "
                            + "shipment is delivered, which the v9 eFormidling service task now does itself - and "
                            + "the Altinn Events reminder that used to move the process past the feedback task is "
                            + "gone, so nothing will advance it. Instances would wait there indefinitely. Keep it "
                            + "only if it models a decision gate of its own (e.g. a service-owner review), in "
                            + "which case something must advance it."
                    );
                    continue;
                }

                messages.Todo(
                    $"The feedback task '{feedbackTaskId}' follows the service task '{serviceTaskId}'. In v9 "
                        + "the process parks on a service task while its work is pending and the frontend shows "
                        + "a waiting step automatically, so the feedback task may be a redundant v8 waiting "
                        + "pattern that now needs a separate out-of-band process/next to clear. Review it: "
                        + "remove the feedback task if the wait belongs to the service task's own outcome, or "
                        + "keep it if it models a separate decision gate (e.g. a service-owner review)."
                );
            }
        }
    }

    /// <summary>
    /// Walks incoming sequence flows from the given node, looking through gateways, and returns the
    /// ids of any service tasks found as the effective predecessor. Other element kinds (tasks,
    /// events) end their path: a feedback task behind a data task is the normal v8/v9 pattern.
    /// </summary>
    private static IEnumerable<string> FindUpstreamServiceTasks(
        string startId,
        IReadOnlyDictionary<string, XElement> elementsById,
        IReadOnlyList<(string Source, string Target)> flows
    )
    {
        var hits = new List<string>();
        var visited = new HashSet<string>(StringComparer.Ordinal) { startId };
        var queue = new Queue<string>();
        queue.Enqueue(startId);

        while (queue.Count > 0)
        {
            var current = queue.Dequeue();
            foreach (var (source, _) in flows.Where(f => f.Target == current))
            {
                if (!visited.Add(source) || !elementsById.TryGetValue(source, out var sourceElement))
                    continue;

                if (sourceElement.Name.LocalName == "serviceTask")
                {
                    hits.Add(source);
                }
                else if (sourceElement.Name.LocalName.EndsWith("Gateway", StringComparison.OrdinalIgnoreCase))
                {
                    queue.Enqueue(source);
                }
            }
        }

        return hits;
    }

    private static string? GetAltinnTaskType(XElement task) =>
        task.Element(XName.Get("extensionElements", task.Name.NamespaceName))
            ?.Element(_altinnNs + "taskExtension")
            ?.Element(_altinnNs + "taskType")
            ?.Value.Trim();
}
