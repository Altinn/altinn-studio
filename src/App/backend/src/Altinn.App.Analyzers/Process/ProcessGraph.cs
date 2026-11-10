using System.Xml.Linq;

namespace Altinn.App.Analyzers.Process;

/// <summary>
/// The process as the runtime moves an instance through it (<c>ProcessReader</c> and <c>ProcessNavigator</c> in
/// Altinn.App.Core): the nodes it loads from the process's direct children, which are the start events, tasks,
/// service tasks, exclusive gateways and end events, and the sequence flows between them. See
/// <see cref="ProcessFlowUtils"/> for how the runtime follows a flow.
/// </summary>
internal sealed class ProcessGraph
{
    /// <param name="process">The process the runtime binds.</param>
    internal ProcessGraph(XElement process)
    {
        foreach (var element in process.Elements())
        {
            if (element.Name == ProcessFile.SequenceFlow)
            {
                Flows.Add(element);
                if (element.Attribute("sourceRef")?.Value is { } sourceRef)
                {
                    AddTo(FlowsBySource, sourceRef, element);
                }
            }
            else if (IsNode(element.Name))
            {
                Nodes.Add(element);
                if (Id(element) is { } id)
                {
                    AddTo(NodesById, id, element);
                }
            }
        }
    }

    /// <summary>The nodes, in document order.</summary>
    internal List<XElement> Nodes { get; } = [];

    /// <summary>The sequence flows, in document order.</summary>
    internal List<XElement> Flows { get; } = [];

    /// <summary>Every node with the id, as <c>GetNextElements</c> finds them all.</summary>
    internal Dictionary<string, List<XElement>> NodesById { get; } = new(StringComparer.Ordinal);

    /// <summary>The sequence flows by their <c>sourceRef</c>.</summary>
    internal Dictionary<string, List<XElement>> FlowsBySource { get; } = new(StringComparer.Ordinal);

    /// <summary>The ids of the start events and of every node an instance can move on to from them.</summary>
    internal HashSet<string> ReachableIds()
    {
        var reached = new HashSet<string>(StringComparer.Ordinal);
        var pending = new Stack<string>();
        foreach (var node in Nodes)
        {
            if (node.Name == ProcessFile.StartEvent && Id(node) is { } id && reached.Add(id))
            {
                pending.Push(id);
            }
        }

        while (pending.Count > 0)
        {
            var id = pending.Pop();
            foreach (var node in NodesById[id])
            {
                foreach (var flow in FollowedFlows(node, id))
                {
                    if (
                        flow.Attribute("targetRef")?.Value is { } targetRef
                        && NodesById.ContainsKey(targetRef)
                        && reached.Add(targetRef)
                    )
                    {
                        pending.Push(targetRef);
                    }
                }
            }
        }

        return reached;
    }

    /// <summary>The flows the runtime takes out of the gateway (<c>GetOutgoingSequenceFlows</c>), in document order.</summary>
    internal List<XElement> ListedFlows(XElement gateway)
    {
        var listed = new HashSet<string>(StringComparer.Ordinal);
        foreach (var outgoing in gateway.Elements(ProcessFile.Outgoing))
        {
            listed.Add(outgoing.Value);
        }

        return Flows.Where(f => Id(f) is { } id && listed.Contains(id)).ToList();
    }

    internal bool LeadsToNode(XElement flow) =>
        flow.Attribute("targetRef")?.Value is { } targetRef && NodesById.ContainsKey(targetRef);

    /// <summary>The elements the runtime moves an instance between (see <c>Process.cs</c> in Altinn.App.Core).</summary>
    internal static bool IsNode(XName name) =>
        name == ProcessFile.StartEvent
        || name == ProcessFile.Task
        || name == ProcessFile.ServiceTask
        || name == ProcessFile.ExclusiveGateway
        || name == ProcessFile.EndEvent;

    internal static string? Id(XElement element) => element.Attribute("id")?.Value is { Length: > 0 } id ? id : null;

    // The flows the runtime follows out of the node.
    private List<XElement> FollowedFlows(XElement node, string nodeId)
    {
        if (node.Name == ProcessFile.EndEvent)
        {
            return [];
        }

        if (node.Name == ProcessFile.ExclusiveGateway)
        {
            return ListedFlows(node);
        }

        return FlowsBySource.TryGetValue(nodeId, out var leaving) ? leaving : [];
    }

    private static void AddTo(Dictionary<string, List<XElement>> map, string key, XElement element)
    {
        if (!map.TryGetValue(key, out var list))
        {
            map[key] = list = [];
        }

        list.Add(element);
    }
}
