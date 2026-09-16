using System.Collections.Generic;
using System.Linq;
using Altinn.App.Core.Internal.Process.Elements;

namespace Altinn.Studio.Designer.Helpers.Extensions;

/// <summary>
/// Extensions for the BPMN process definition.
/// </summary>
public static class ProcessExtensions
{
    /// <summary>
    /// Returns every element of the process that is a task: the <c>bpmn:task</c> elements and the
    /// <c>bpmn:serviceTask</c> elements (PDF generation, eFormidling). Both carry an Altinn task type in
    /// their extension elements, both take part in the sequence flow, and both can own a ui folder, so any
    /// lookup that answers "which task is this id, and what type is it" has to consider both. The app
    /// runtime makes the same union in <c>Altinn.App.Core</c>'s <c>ProcessReader.GetProcessTasks</c>.
    /// </summary>
    /// <remarks>
    /// Call sites that deliberately mean process tasks only — a step a user fills in — read
    /// <c>Process.Tasks</c> directly instead of calling this.
    /// </remarks>
    public static IEnumerable<ProcessTask> AllTasks(this Process process) =>
        (process.Tasks ?? []).Concat<ProcessTask>(process.ServiceTasks ?? []);

    /// <summary>
    /// Returns the ids of every task, service tasks included, in the order they are first reached when
    /// walking the sequence flows from the start event, so the order stays stable regardless of element
    /// order in the BPMN file. Tasks not reachable from a start event are appended last, in their declared
    /// order.
    /// </summary>
    public static List<string> OrderAllTaskIdsByFlow(this Process process)
    {
        List<string> taskIds = process.AllTasks().Select(task => task.Id).ToList();

        ILookup<string, string> outgoingTargets = (process.SequenceFlow ?? [])
            .Where(flow => flow.SourceRef is not null && flow.TargetRef is not null)
            .ToLookup(flow => flow.SourceRef, flow => flow.TargetRef);

        IEnumerable<string> startIds = (process.StartEvents ?? []).Select(startEvent => startEvent.Id);
        List<string> orderedTaskIds = TraverseTaskIdsFromStart(startIds, outgoingTargets, [.. taskIds]);

        // Tasks not reachable from a start event still need a defined position, appended in declared order.
        HashSet<string> reachedTaskIds = [.. orderedTaskIds];
        orderedTaskIds.AddRange(taskIds.Where(taskId => !reachedTaskIds.Contains(taskId)));

        return orderedTaskIds;
    }

    private static List<string> TraverseTaskIdsFromStart(
        IEnumerable<string> startIds,
        ILookup<string, string> outgoingTargets,
        HashSet<string> taskIds
    )
    {
        List<string> orderedTaskIds = [];
        HashSet<string> visited = [];
        Queue<string> toVisit = new(startIds);

        while (toVisit.Count > 0)
        {
            string elementId = toVisit.Dequeue();
            if (!visited.Add(elementId))
            {
                continue;
            }
            if (taskIds.Contains(elementId))
            {
                orderedTaskIds.Add(elementId);
            }
            foreach (string target in outgoingTargets[elementId])
            {
                toVisit.Enqueue(target);
            }
        }

        return orderedTaskIds;
    }
}
