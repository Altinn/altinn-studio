using System.Xml.Linq;
using Altinn.App.Analyzers.Utils;

namespace Altinn.App.Analyzers.Process;

/// <summary>
/// <para>
/// Checks that the sequence flows in <c>config/process/process.bpmn</c> form a process the app can follow, the way
/// the runtime reads it (<c>ProcessReader</c>, <c>ProcessNavigator</c> and <c>ProcessEngine</c> in
/// Altinn.App.Core). The runtime binds the single <c>&lt;bpmn:process&gt;</c> and reads only its direct children:
/// the start events, tasks, service tasks, exclusive gateways and end events (the nodes), and the sequence flows.
/// It follows a flow in only two ways. From a start event, task or service task it takes every flow whose
/// <c>sourceRef</c> is the node, and skips one whose <c>targetRef</c> names no node, which fails only when no flow
/// out of the node names one. From an exclusive gateway it takes every flow whose id the gateway lists in
/// <c>&lt;bpmn:outgoing&gt;</c>, whatever the flow's own <c>sourceRef</c>, and ignores listed ids that name no
/// flow; when one of those flows has a condition, it evaluates every one of them but the gateway's default,
/// treating a flow without a condition as true and failing on an empty one, and takes the default only when none of
/// them holds. A flow it cannot follow fails only when an instance tries to leave the node, so these rules move that
/// failure to the build.
/// </para>
/// <para>
/// A condition on a gateway's default is checked even on unreachable gateways, because it prevents app startup.
/// The flow navigation checks apply only to reachable nodes and the flows out of them: an instance stands only on
/// a start event or a node it reaches from one. An unconnected task in Studio's process editor cannot cause a
/// navigation failure.
/// </para>
/// <para>
/// Two rules go beyond what fails at runtime, deliberately. A flow that starts at a gateway but is not listed in its
/// <c>&lt;bpmn:outgoing&gt;</c> is an error (ALTINNAPP1005): Studio draws it as one of the gateway's branches, but
/// the app never takes it, so the process does not do what the diagram shows. And an id that more than one node or
/// sequence flow uses is an error anywhere in the process (ALTINNAPP1009): BPMN requires ids to be unique within the
/// document; Studio's process editor opens such a file but drops every later element that repeats an id on import,
/// so the next save from Studio deletes it; and the runtime misroutes on duplicate nodes (<c>GetFlowElement</c>
/// picks one by element type, and <c>GetNextElements</c> returns every match) and on duplicate flow ids a gateway
/// lists (<c>GetOutgoingSequenceFlows</c> returns both).
/// </para>
/// </summary>
internal static class ProcessFlowUtils
{
    /// <summary>Appends a diagnostic for every flow problem in the process.</summary>
    internal static void CollectDiagnostics(
        ImmutableArray<AdditionalText> additionalFiles,
        CancellationToken token,
        List<Diagnostic> diagnostics
    )
    {
        var processFile = ProcessFile.FindSingle(additionalFiles);
        if (processFile is null || ProcessFile.TryParse(processFile, token) is not { } parsed)
        {
            return;
        }

        var (content, document) = parsed;
        if (ProcessFile.SingleProcess(document) is not { } process)
        {
            return;
        }

        Location LocationOf(XElement element) =>
            FileLocationHelper.GetXmlElementLocation(processFile, content, element);

        var graph = new ProcessGraph(process);
        // Elements the runtime does not load, kept only to name them when a flow leads to one.
        var otherElementsById = new Dictionary<string, XElement>(StringComparer.Ordinal);
        foreach (var element in process.Elements())
        {
            if (
                element.Name != ProcessFile.SequenceFlow
                && !ProcessGraph.IsNode(element.Name)
                && Id(element) is { } id
                && !otherElementsById.ContainsKey(id)
            )
            {
                otherElementsById[id] = element;
            }
        }

        CheckDuplicateIds();

        var reachable = graph.ReachableIds();
        var reportedFlows = new HashSet<XElement>();
        var gateways = new List<(XElement Gateway, string Id, List<XElement> Flows)>();
        foreach (var node in graph.Nodes)
        {
            token.ThrowIfCancellationRequested();
            if (Id(node) is not { } nodeId)
            {
                continue;
            }
            // Startup rejects a condition on any gateway's default, even if no instance can reach it.
            if (node.Name == ProcessFile.ExclusiveGateway)
            {
                CheckGatewayDefaultCondition(node, nodeId);
            }
            // The process ends at an end event, so the runtime never follows a flow out of one.
            if (node.Name == ProcessFile.EndEvent || !reachable.Contains(nodeId))
            {
                continue;
            }

            var leaving = graph.FlowsBySource.TryGetValue(nodeId, out var found) ? found : [];
            if (node.Name == ProcessFile.ExclusiveGateway)
            {
                gateways.Add((node, nodeId, CheckGateway(node, nodeId, leaving)));
                continue;
            }

            if (leaving.Count == 0)
            {
                diagnostics.Add(
                    Diagnostic.Create(
                        Diagnostics.Process.ElementHasNoOutgoingFlow,
                        LocationOf(node),
                        DisplayName(node.Name),
                        nodeId
                    )
                );
                continue;
            }

            // GetNextElements adds nothing for a flow to nowhere, so such a flow fails only when no other one leads
            // to a node.
            var targets = leaving.Where(graph.LeadsToNode).ToList();
            foreach (var flow in leaving)
            {
                CheckTarget(flow, reportUnresolved: targets.Count == 0);
            }

            if (targets.Count > 1)
            {
                diagnostics.Add(
                    Diagnostic.Create(
                        Diagnostics.Process.ElementHasSeveralOutgoingFlows,
                        LocationOf(node),
                        DisplayName(node.Name),
                        nodeId,
                        targets.Count,
                        string.Join(", ", targets.Select(FlowReference))
                    )
                );
            }
        }

        CheckGatewayLoops();

        // Nodes and flows share one count; see the class summary for why. Only the second occurrence carries the
        // diagnostic, so its placement is predictable.
        void CheckDuplicateIds()
        {
            var idCounts = new Dictionary<string, int>(StringComparer.Ordinal);
            var duplicates = new List<(string Id, XElement Element)>();
            foreach (var element in process.Elements())
            {
                if (
                    (ProcessGraph.IsNode(element.Name) || element.Name == ProcessFile.SequenceFlow)
                    && Id(element) is { } id
                )
                {
                    idCounts.TryGetValue(id, out var count);
                    idCounts[id] = count + 1;
                    if (count == 1)
                    {
                        duplicates.Add((id, element));
                    }
                }
            }

            foreach (var (id, element) in duplicates)
            {
                diagnostics.Add(
                    Diagnostic.Create(
                        Diagnostics.Process.DuplicateProcessElementId,
                        LocationOf(element),
                        id,
                        idCounts[id]
                    )
                );
            }
        }

        void CheckGatewayDefaultCondition(XElement gateway, string gatewayId)
        {
            if (gateway.Attribute("default")?.Value is not { Length: > 0 } defaultId)
            {
                return;
            }
            var defaultFlow = graph.ListedFlows(gateway).Find(flow => Id(flow) == defaultId);
            if (defaultFlow?.Element(ProcessFile.ConditionExpression) is not null)
            {
                diagnostics.Add(
                    Diagnostic.Create(
                        Diagnostics.Process.GatewayDefaultHasCondition,
                        LocationOf(gateway),
                        gatewayId,
                        defaultId
                    )
                );
            }
        }

        // Returns the flows the gateway takes.
        List<XElement> CheckGateway(XElement gateway, string gatewayId, List<XElement> leaving)
        {
            var taken = graph.ListedFlows(gateway);
            foreach (var flow in taken)
            {
                var sourceRef = flow.Attribute("sourceRef")?.Value;
                if (sourceRef != gatewayId)
                {
                    var startsAt = sourceRef is not { Length: > 0 } ? "has no sourceRef" : $"starts at '{sourceRef}'";
                    ReportGatewayMismatch(
                        gateway,
                        gatewayId,
                        $"lists '{Id(flow)}' in <bpmn:outgoing>, but that sequence flow {startsAt}"
                    );
                }

                // When the gateway chooses a flow to nowhere, GetFlowElement finds nothing and leaving it fails.
                CheckTarget(flow, reportUnresolved: true);
            }

            foreach (var flow in leaving)
            {
                if (!taken.Contains(flow))
                {
                    ReportGatewayMismatch(
                        gateway,
                        gatewayId,
                        $"is the sourceRef of {FlowName(flow)}, but does not list it in <bpmn:outgoing>"
                    );
                }
            }

            // The runtime looks the default up among the flows it takes, and ignores it when it is not there.
            XElement? defaultFlow = null;
            if (gateway.Attribute("default")?.Value is { Length: > 0 } defaultId)
            {
                defaultFlow = taken.Find(f => Id(f) == defaultId);
                if (defaultFlow is null)
                {
                    diagnostics.Add(
                        Diagnostic.Create(
                            Diagnostics.Process.GatewayDefaultNotOutgoing,
                            LocationOf(gateway),
                            gatewayId,
                            defaultId
                        )
                    );
                }
            }

            if (taken.Count == 0 && leaving.Count == 0)
            {
                diagnostics.Add(
                    Diagnostic.Create(
                        Diagnostics.Process.ElementHasNoOutgoingFlow,
                        LocationOf(gateway),
                        DisplayName(gateway.Name),
                        gatewayId
                    )
                );
            }

            // One condition switches the gateway to ExpressionsExclusiveGateway, which evaluates every flow but the
            // default and counts a flow without a condition as a match, and ProcessNavigator fails when more than one
            // flow matches. An empty <bpmn:conditionExpression> still counts as a condition here, as the runtime
            // reads it as "".
            var evaluated = taken.Where(f => f != defaultFlow).ToList();
            var unconditioned = evaluated.Where(f => f.Element(ProcessFile.ConditionExpression) is null).ToList();
            if (unconditioned.Count > 0 && unconditioned.Count < evaluated.Count)
            {
                diagnostics.Add(
                    Diagnostic.Create(
                        Diagnostics.Process.GatewayMixesConditions,
                        LocationOf(gateway),
                        gatewayId,
                        string.Join(", ", unconditioned.Select(FlowReference)),
                        unconditioned.Count == 1
                            ? "so leaving the gateway fails whenever a condition holds"
                            : "so those flows always match together and leaving the gateway always fails",
                        unconditioned.Count > 1 ? "Give each of them a condition"
                            : defaultFlow is null ? "Give it a condition, or make it the gateway's default"
                            : "Give it a condition"
                    )
                );
            }

            // The gateway evaluates every flow it takes but the default, and an empty condition fails to parse.
            foreach (var flow in evaluated)
            {
                if (
                    flow.Element(ProcessFile.ConditionExpression) is { } condition
                    && condition.Value.Trim().Length == 0
                )
                {
                    diagnostics.Add(
                        Diagnostic.Create(
                            Diagnostics.Process.GatewayEmptyCondition,
                            LocationOf(gateway),
                            gatewayId,
                            FlowName(flow)
                        )
                    );
                }
            }

            return taken;
        }

        void ReportGatewayMismatch(XElement gateway, string gatewayId, string problem) =>
            diagnostics.Add(
                Diagnostic.Create(Diagnostics.Process.GatewayOutgoingMismatch, LocationOf(gateway), gatewayId, problem)
            );

        // Checks a flow the runtime follows. The next element is every node whose id is the targetRef
        // (GetNextElements, GetFlowElement). ProcessNavigator resolves a gateway to what lies beyond it, and
        // ProcessEngine.ComputeNextTransition moves an instance only to a task or an end event: one moved to a start
        // event is left with no current task, wherever the flow comes from. A flow that leads to no node is reported
        // only when reportUnresolved says that fails.
        void CheckTarget(XElement flow, bool reportUnresolved)
        {
            string problem;
            var resolves = false;
            if (flow.Attribute("targetRef")?.Value is not { } targetRef || targetRef.Trim().Length == 0)
            {
                problem = "has no targetRef";
            }
            else if (graph.NodesById.TryGetValue(targetRef, out var targets))
            {
                if (targets[0].Name != ProcessFile.StartEvent)
                {
                    return;
                }

                problem = $"leads to start event '{targetRef}'";
                resolves = true;
            }
            else if (otherElementsById.TryGetValue(targetRef, out var other))
            {
                var element =
                    other.Name.Namespace == ProcessFile.Bpmn
                        ? $"a <{QualifiedName(other)}> element"
                        : $"a <{QualifiedName(other)}> element without the BPMN namespace";
                problem = $"has targetRef '{targetRef}', {element}, which the app does not run";
            }
            else
            {
                problem = $"has targetRef '{targetRef}', but no element of the process has that id";
            }

            // The runtime can follow one flow twice: out of the node its sourceRef names, and out of a gateway that
            // lists it. Report it once.
            if ((!resolves && !reportUnresolved) || !reportedFlows.Add(flow))
            {
                return;
            }

            diagnostics.Add(
                Diagnostic.Create(
                    Diagnostics.Process.SequenceFlowLeadsToUnsupportedElement,
                    LocationOf(flow),
                    Capitalize(FlowName(flow)),
                    problem
                )
            );
        }

        // ProcessNavigator follows a flow into a gateway by recursing into it, with no guard against a cycle.
        void CheckGatewayLoops()
        {
            // A duplicated gateway id is reported above; the runtime finds the first gateway with the id.
            var firsts = gateways.GroupBy(g => g.Id, StringComparer.Ordinal).Select(g => g.First()).ToList();
            var indexById = new Dictionary<string, int>(StringComparer.Ordinal);
            for (var i = 0; i < firsts.Count; i++)
            {
                indexById[firsts[i].Id] = i;
            }

            var successors = new List<int>[firsts.Count];
            for (var i = 0; i < firsts.Count; i++)
            {
                successors[i] = [];
                foreach (var flow in firsts[i].Flows)
                {
                    if (
                        flow.Attribute("targetRef")?.Value is { } targetRef
                        && indexById.TryGetValue(targetRef, out var target)
                    )
                    {
                        successors[i].Add(target);
                    }
                }
            }

            // Processes have few gateways, so plain reachability from each one is enough to find the loops.
            var reaches = new bool[successors.Length][];
            for (var start = 0; start < successors.Length; start++)
            {
                token.ThrowIfCancellationRequested();
                var reached = reaches[start] = new bool[successors.Length];
                var pending = new Stack<int>(successors[start]);
                while (pending.Count > 0)
                {
                    var next = pending.Pop();
                    if (reached[next])
                    {
                        continue;
                    }

                    reached[next] = true;
                    foreach (var successor in successors[next])
                    {
                        pending.Push(successor);
                    }
                }
            }

            var reported = new bool[successors.Length];
            for (var first = 0; first < successors.Length; first++)
            {
                if (reported[first] || !reaches[first][first])
                {
                    continue;
                }

                // The other gateways in the loop, which the first one reaches and is reached from.
                var others = new List<string>();
                for (var other = first + 1; other < successors.Length; other++)
                {
                    if (reaches[first][other] && reaches[other][first])
                    {
                        reported[other] = true;
                        others.Add($"'{firsts[other].Id}'");
                    }
                }

                diagnostics.Add(
                    Diagnostic.Create(
                        Diagnostics.Process.GatewayLoop,
                        LocationOf(firsts[first].Gateway),
                        firsts[first].Id,
                        others.Count == 0 ? "leads back to itself" : $"forms a loop with {string.Join(", ", others)}"
                    )
                );
            }
        }
    }

    private static string? Id(XElement element) => ProcessGraph.Id(element);

    private static string FlowName(XElement flow) =>
        Id(flow) is { } id ? $"sequence flow '{id}'" : "a sequence flow without an id";

    private static string FlowReference(XElement flow) => Id(flow) is { } id ? $"'{id}'" : "one without an id";

    private static string Capitalize(string text) => char.ToUpperInvariant(text[0]) + text.Substring(1);

    // Only the nodes a flow leaves are named; the runtime never leaves an end event.
    private static string DisplayName(XName name) =>
        name.LocalName switch
        {
            "startEvent" => "Start event",
            "task" => "Task",
            "serviceTask" => "Service task",
            "exclusiveGateway" => "Exclusive gateway",
            _ => name.LocalName,
        };

    /// <summary>The element's name as the document writes it, with the prefix it declares for the namespace.</summary>
    private static string QualifiedName(XElement element) =>
        element.GetPrefixOfNamespace(element.Name.Namespace) is { Length: > 0 } prefix
            ? $"{prefix}:{element.Name.LocalName}"
            : element.Name.LocalName;
}
