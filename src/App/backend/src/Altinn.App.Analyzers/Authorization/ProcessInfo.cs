using System.Xml;
using System.Xml.Linq;

namespace Altinn.App.Analyzers.Authorization;

/// <summary>A task in the process, with what determines the actions the app owner must be permitted.</summary>
/// <param name="Id">The BPMN element id, used to recognise grants scoped to this task.</param>
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
        foreach (var endEvent in document.Descendants().Where(e => e.Name.LocalName == "endEvent"))
        {
            if (endEvent.Attribute("id")?.Value is { Length: > 0 } id)
            {
                endEventIds.Add(id);
            }
        }

        var tasks = new List<ProcessTaskInfo>();
        foreach (var taskType in document.Descendants().Where(e => e.Name.LocalName == "taskType"))
        {
            var type = taskType.Value.Trim();
            if (type.Length == 0)
            {
                continue;
            }

            // The taskType extension element lives inside the task element, which carries the id.
            // Nothing between the two has an id of its own, so the nearest one is the task's.
            var taskElement = taskType.Ancestors().FirstOrDefault(a => a.Attribute("id") is not null);
            tasks.Add(
                new ProcessTaskInfo(
                    taskElement?.Attribute("id")?.Value,
                    type,
                    AllowsReject: taskElement is not null && DeclaresRejectProcessAction(taskElement)
                )
            );
        }

        return new ProcessInfo(tasks, endEventIds);
    }

    /// <summary>
    /// Whether the task declares <c>reject</c> in its <c>altinn:actions</c> list as a process
    /// action. A <c>type="serverAction"</c> entry is a user-triggered server action, not a process
    /// transition, so it never reaches the abandon flow.
    /// </summary>
    private static bool DeclaresRejectProcessAction(XElement taskElement) =>
        taskElement
            .Descendants()
            .Where(e => e.Name.LocalName == "action" && e.Parent?.Name.LocalName == "actions")
            .Any(action =>
                string.Equals(action.Value.Trim(), "reject", StringComparison.OrdinalIgnoreCase)
                && action.Attributes().All(a => a.Name.LocalName != "type" || a.Value == "processAction")
            );
}
