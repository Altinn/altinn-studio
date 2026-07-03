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
        List<ProcessTask> tasks = process.Tasks ?? [];
        HashSet<string> taskIds = [.. tasks.Select(task => task.Id)];

        ILookup<string, string> outgoingTargets = (process.SequenceFlow ?? [])
            .Where(flow => flow.SourceRef is not null && flow.TargetRef is not null)
            .ToLookup(flow => flow.SourceRef, flow => flow.TargetRef);

        List<string> orderedTaskIds = [];
        HashSet<string> visited = [];
        Queue<string> toVisit = new((process.StartEvents ?? []).Select(startEvent => startEvent.Id));

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

        orderedTaskIds.AddRange(tasks.Select(task => task.Id).Where(taskId => !visited.Contains(taskId)));

        return orderedTaskIds;
    }
}
