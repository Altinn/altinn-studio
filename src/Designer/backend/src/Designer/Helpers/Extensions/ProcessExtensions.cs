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
    /// Returns the process task ids in the order they are first reached when walking the sequence flows from
    /// the start event, so the order stays stable regardless of element order in the BPMN file. Tasks not
    /// reachable from a start event are appended last, in their declared order.
    /// </summary>
    public static List<string> OrderTaskIdsByFlow(this Process process)
    {
        List<string> taskIds = (process.Tasks ?? []).Select(task => task.Id).ToList();

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
