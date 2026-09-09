using System.Xml;
using System.Xml.Linq;

namespace Altinn.App.Analyzers.Authorization;

/// <summary>A task in the process, with what determines the actions the app owner must be permitted.</summary>
/// <param name="Id">The BPMN element id, used to recognize grants scoped to this task.</param>
/// <param name="TaskType">The <c>altinn:taskType</c> value.</param>
/// <param name="AllowsReject">
/// Whether the task declares <c>reject</c> as a process action, meaning a transition can abandon it.
/// </param>
internal sealed record ProcessTaskInfo(string? Id, string TaskType, bool AllowsReject);

/// <summary>
/// What is read out of <c>config/process/process.bpmn</c> to decide which actions the app owner needs
/// beyond the unconditional baseline - deliberately only that, not a model of the process: nothing
/// here describes flows, gateways or events. Mirrors the record of the same name in the v8-to-v9
/// policy migrator, which reads the same three things for the same purpose.
/// </summary>
internal sealed class ProcessInfo
{
    /// <summary>
    /// The namespaces the app runtime itself requires when it reads a process
    /// (<c>Process.cs</c> and <c>AltinnTaskExtension.cs</c> in Altinn.App.Core bind to exactly
    /// these). Matching on local names alone would let an unrelated <c>foo:taskType</c> or
    /// <c>foo:action</c> from some other vendor extension invent requirements the runtime will never
    /// ask Storage to authorize.
    /// </summary>
    private static readonly XNamespace _bpmn = "http://www.omg.org/spec/BPMN/20100524/MODEL";

    /// <inheritdoc cref="_bpmn"/>
    private static readonly XNamespace _altinn = "http://altinn.no/process";

    private ProcessInfo(IReadOnlyList<ProcessTaskInfo> tasks, HashSet<string> endEventIds)
    {
        Tasks = tasks;
        EndEventIds = endEventIds;
    }

    internal IReadOnlyList<ProcessTaskInfo> Tasks { get; }

    /// <summary>End event ids, used to accept <c>complete</c> grants scoped to a real end event.</summary>
    internal HashSet<string> EndEventIds { get; }

    /// <summary>Parses the process, or returns null when the document is not valid XML.</summary>
    internal static ProcessInfo? TryParse(string xml)
    {
        XDocument document;
        try
        {
            document = XDocument.Parse(xml);
        }
        catch (XmlException)
        {
            return null;
        }

        if (document.Root is null)
        {
            return null;
        }

        var endEventIds = new HashSet<string>(StringComparer.Ordinal);
        foreach (var endEvent in document.Descendants(_bpmn + "endEvent"))
        {
            if (endEvent.Attribute("id")?.Value is { Length: > 0 } id)
            {
                endEventIds.Add(id);
            }
        }

        var tasks = new List<ProcessTaskInfo>();
        foreach (var taskType in document.Descendants(_altinn + "taskType"))
        {
            var type = taskType.Value.Trim();
            if (type.Length == 0)
            {
                continue;
            }

            var taskElement = FindHostingFlowNode(taskType);
            tasks.Add(
                new ProcessTaskInfo(
                    // An id is what makes a task-scoped grant recognizable. Without one there is
                    // nothing to compare a scope against, so the task is left unidentified and its
                    // requirement ends up unscoped - which reports 'cannot verify' rather than
                    // 'missing' for a scoped grant.
                    taskElement?.Attribute("id")?.Value
                        is { Length: > 0 } taskId
                        ? taskId
                        : null,
                    type,
                    AllowsReject: taskElement is not null && DeclaresRejectProcessAction(taskElement)
                )
            );
        }

        return new ProcessInfo(tasks, endEventIds);
    }

    /// <summary>
    /// The flow node a <c>taskType</c> belongs to: the nearest enclosing <c>bpmn:task</c> or
    /// <c>bpmn:serviceTask</c>. Those are the only two elements that can carry a task extension (see
    /// <c>Process.cs</c> in Altinn.App.Core, which models the process's element set), so walking up to
    /// "the nearest ancestor with an id" instead would silently accept the enclosing
    /// <c>bpmn:process</c> when a task is missing its own id - and then evaluate task-scoped grants
    /// against the process id.
    /// </summary>
    private static XElement? FindHostingFlowNode(XElement taskType) =>
        taskType.Ancestors().FirstOrDefault(a => a.Name == _bpmn + "task" || a.Name == _bpmn + "serviceTask");

    /// <summary>
    /// Whether the task declares <c>reject</c> in its <c>altinn:actions</c> list as a process
    /// action. A <c>type="serverAction"</c> entry is a user-triggered server action, not a process
    /// transition, so it never reaches the abandon flow.
    /// </summary>
    private static bool DeclaresRejectProcessAction(XElement taskElement) =>
        taskElement
            .Descendants(_altinn + "action")
            .Where(e => e.Parent?.Name == _altinn + "actions")
            .Any(action =>
                string.Equals(action.Value.Trim(), "reject", StringComparison.OrdinalIgnoreCase)
                && action.Attributes().All(a => a.Name.LocalName != "type" || a.Value == "processAction")
            );
}
