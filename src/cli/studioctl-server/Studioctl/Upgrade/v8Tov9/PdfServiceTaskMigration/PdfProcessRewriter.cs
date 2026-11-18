using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Xml;
using System.Xml.Linq;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.PdfServiceTaskMigration;

/// <summary>
/// Rewrites a process.bpmn file to add a <c>pdf</c> service task after each task that previously
/// relied on the deprecated <c>enablePdfCreation</c> flag in applicationmetadata.json.
///
/// The legacy flag generated one PDF at the end of the task a pdf-enabled datamodel was bound to.
/// The faithful equivalent is a <c>pdf</c> service task inserted immediately after that task:
/// <c>T --flow--> X</c> becomes <c>T --flow--> PdfTask_T --newFlow--> X</c>. How the service task
/// renders the PDF depends on the task's UI settings; see <see cref="SourceTaskPdfLayout"/>.
///
/// A gateway that routes on <c>gatewayAction</c> right after the task is the exception: after a service task a
/// gateway sees the service task's action instead of the user's. After a signing task with a plain sign and reject
/// split, the pdf task goes on the sign branch: v8 made the PDF when the task ended, and rejecting abandons the task
/// instead. Any other such task is left for the developer.
///
/// We rely on <c>sequenceFlow</c> <c>sourceRef</c>/<c>targetRef</c> (what the process engine uses),
/// and treat the informational <c>&lt;incoming&gt;</c>/<c>&lt;outgoing&gt;</c> child elements as
/// best-effort hints.
/// </summary>
internal sealed class PdfProcessRewriter
{
    private readonly XDocument _doc;
    private readonly string _processFile;
    private readonly XNamespace _altinnNs = "http://altinn.no/process";
    private readonly XNamespace _bpmndiNs = "http://www.omg.org/spec/BPMN/20100524/DI";
    private readonly XNamespace _dcNs = "http://www.omg.org/spec/DD/20100524/DC";
    private readonly XNamespace _diNs = "http://www.omg.org/spec/DD/20100524/DI";
    private readonly List<string> _warnings = new();
    private readonly List<string> _todos = new();
    private readonly List<string> _skippedTasks = new();
    private readonly List<string> _insertedTasks = new();
    private readonly bool _sourceHadBom;
    private readonly string _newline;
    private readonly bool _hadTrailingNewline;
    private bool _addedShapes;

    /// <summary>
    /// The configuration elements of payment and signing tasks that name a data type the task creates elements of.
    /// </summary>
    private static readonly HashSet<string> _taskCreatedDataTypeElements = new(StringComparer.Ordinal)
    {
        "paymentDataType",
        "paymentReceiptPdfDataType",
        "signatureDataType",
        "signeeStatesDataTypeId",
        "signingPdfDataType",
    };

    // Standard bpmn.io task shape size and the vertical gap below the source task.
    private const int PdfShapeWidth = 100;
    private const int PdfShapeHeight = 80;
    private const int PdfShapeVerticalGap = 60;

    public PdfProcessRewriter(string processFile)
    {
        _processFile = processFile;
        // Strict decode: throws DecoderFallbackException on non-UTF-8 content instead of silently
        // corrupting it, and strips the BOM (XDocument.Parse rejects a leading BOM character).
        var (text, hadBom) = Utf8TextFile.Decode(File.ReadAllBytes(processFile));
        _sourceHadBom = hadBom;
        _newline = text.Contains("\r\n", StringComparison.Ordinal) ? "\r\n" : "\n";
        _hadTrailingNewline = text.EndsWith('\n');
        _doc = XDocument.Parse(text);
    }

    public IReadOnlyList<string> GetWarnings() => _warnings;

    /// <summary>What is left for the developer to do about a task whose PDF service task was not inserted.</summary>
    public IReadOnlyList<string> GetTodos() => _todos;

    /// <summary>Whether any insertion actually changed the document; false means nothing to write.</summary>
    public bool HasChanges { get; private set; }

    /// <summary>
    /// Task ids for which a PDF service task could not be inserted (task missing or ambiguous flow).
    /// A task whose PDF service task already exists (e.g. from a previous migration run) counts as
    /// satisfied, not skipped. When this is non-empty the caller must not strip the legacy flag,
    /// or the app would end up with neither the v8 flag nor the v9 service task.
    /// </summary>
    public IReadOnlyList<string> GetSkippedTasks() => _skippedTasks;

    /// <summary>Task ids whose PDF service task this rewriter inserted (not counting already migrated ones).</summary>
    public IReadOnlyList<string> GetInsertedTasks() => _insertedTasks;

    /// <summary>The data types whose elements the process's payment and signing tasks create.</summary>
    public IReadOnlySet<string> DataTypesCreatedByTasks() =>
        _doc.Descendants()
            .Where(e => e.Name.Namespace == _altinnNs && _taskCreatedDataTypeElements.Contains(e.Name.LocalName))
            .Select(e => e.Value.Trim())
            .Where(dataType => dataType.Length > 0)
            .ToHashSet(StringComparer.Ordinal);

    /// <summary>The id of the PDF service task inserted after <paramref name="taskId"/>.</summary>
    public static string PdfTaskIdFor(string taskId) => $"PdfTask_{taskId}";

    /// <summary>
    /// Whether the process already has the PDF service task for <paramref name="taskId"/>, typically
    /// from a previous migration run.
    /// </summary>
    public bool HasPdfServiceTaskFor(string taskId)
    {
        var pdfTaskId = PdfTaskIdFor(taskId);
        var processElements =
            _doc.Root?.Elements().Where(e => e.Name.LocalName == "process").SelectMany(p => p.Elements()) ?? [];
        return processElements.Any(e => e.Attribute("id")?.Value == pdfTaskId && IsPdfServiceTask(e));
    }

    /// <summary>
    /// Inserts a pdf service task after each of the given tasks. The paired dataType id (the task's
    /// form data model) is used to pin <c>connectedDataTypeId</c> on any downstream gateway whose
    /// expressions previously inferred their data model from the data task. Changes are held in
    /// memory until <see cref="Write"/> is called.
    /// </summary>
    /// <param name="tasks">The tasks to insert a pdf service task after.</param>
    /// <param name="tasksWithOwnUiFolder">
    /// The tasks whose pdf service task gets a UI folder of its own, which it renders the PDF from. Their
    /// service task has no <c>autoPdfTaskIds</c>.
    /// </param>
    public void InsertPdfServiceTasks(
        IReadOnlyCollection<(string TaskId, string? DataTypeId)> tasks,
        IReadOnlySet<string> tasksWithOwnUiFolder
    )
    {
        if (tasks.Count == 0)
            return;

        List<XElement> processes = _doc.Root?.Elements().Where(e => e.Name.LocalName == "process").ToList() ?? [];
        if (processes.Count != 1)
        {
            _warnings.Add(
                $"process.bpmn contains {processes.Count} <process> element(s) (expected exactly 1); skipped "
                    + "automatic PDF service task insertion - please add the 'pdf' service task(s) manually."
            );
            _skippedTasks.AddRange(tasks.Select(t => t.TaskId));
            return;
        }

        var process = processes[0];

        var plane = _doc.Descendants().FirstOrDefault(e => e.Name.LocalName == "BPMNPlane");

        foreach (var (taskId, dataTypeId) in tasks)
        {
            InsertPdfServiceTaskAfter(process, plane, taskId, dataTypeId, tasksWithOwnUiFolder.Contains(taskId));
        }

        if (_addedShapes)
        {
            _warnings.Add(
                "The process has a BPMN diagram. Diagram shapes for the inserted PDF service task(s) were "
                    + "added below the task or gateway each follows, with best-effort placement - open the process "
                    + "in Altinn Studio Designer to auto-arrange the layout if desired."
            );
        }
    }

    private void InsertPdfServiceTaskAfter(
        XElement process,
        XElement? plane,
        string taskId,
        string? dataTypeId,
        bool hasOwnUiFolder
    )
    {
        var matchingTasks = process.Elements().Where(e => e.Attribute("id")?.Value == taskId).ToList();
        if (matchingTasks.Count != 1)
        {
            _warnings.Add(
                matchingTasks.Count == 0
                    ? $"Task '{taskId}' was not found in the process file. Skipped PDF service task insertion."
                    : $"The id '{taskId}' occurs {matchingTasks.Count} times in the process file. Skipped PDF "
                        + "service task insertion - please make the ids unique and add a 'pdf' service task "
                        + "manually."
            );
            _skippedTasks.Add(taskId);
            return;
        }

        var task = matchingTasks[0];

        // Guard against a stale/colliding taskId that names a non-task element (e.g. a gateway or
        // event left behind by a rename): splicing a pdf service task after it would move PDF
        // generation to a semantically wrong point. Only genuine bpmn tasks carry it.
        if (task.Name.LocalName != "task")
        {
            _warnings.Add(
                $"The id '{taskId}' in applicationmetadata.json refers to a <{task.Name.LocalName}>, not a task, "
                    + "in the process file. Skipped PDF service task insertion - please verify the taskId and add "
                    + "a 'pdf' service task manually."
            );
            _skippedTasks.Add(taskId);
            return;
        }

        var outgoingFlows = process
            .Elements()
            .Where(e => e.Name.LocalName == "sequenceFlow" && e.Attribute("sourceRef")?.Value == taskId)
            .ToList();

        if (outgoingFlows.Count != 1)
        {
            _warnings.Add(
                $"Task '{taskId}' has {outgoingFlows.Count} outgoing sequence flows (expected exactly 1). "
                    + "Skipped automatic PDF service task insertion - please add a 'pdf' service task manually."
            );
            _skippedTasks.Add(taskId);
            return;
        }

        var taskFlow = outgoingFlows[0];
        var pdfTaskId = PdfTaskIdFor(taskId);

        var existingPdfElement = process.Elements().FirstOrDefault(e => e.Attribute("id")?.Value == pdfTaskId);
        if (existingPdfElement is not null)
        {
            if (IsPdfServiceTask(existingPdfElement))
            {
                // Satisfied, not skipped: the task already has its PDF service task (typically from a
                // previous migration run), so re-running the migration can safely strip the legacy flag.
                _warnings.Add(
                    $"An element with id '{pdfTaskId}' already exists; treating task '{taskId}' as already migrated."
                );
                return;
            }

            // Id collision with an unrelated element: treating it as migrated would strip the flag and
            // drop PDF generation. Skip so the flag is kept and the developer resolves it manually.
            _warnings.Add(
                $"An element with id '{pdfTaskId}' already exists but is not a PDF service task. Skipped PDF "
                    + "service task insertion - please resolve the id collision and add a 'pdf' service task manually."
            );
            _skippedTasks.Add(taskId);
            return;
        }

        // The flow the pdf task goes on: the task's own, or the sign branch of the gateway after a signing task.
        var flow = taskFlow;
        switch (FindGatewayActionRouting(process, task, taskFlow))
        {
            case GatewayActionRouting.SignBranch signBranch:
                flow = signBranch.SignFlow;
                _warnings.Add(
                    $"Put PDF service task '{pdfTaskId}' on the sign branch of gateway '{signBranch.GatewayId}' after "
                        + $"signing task '{taskId}', so the gateway still routes on the signer's action. As in v8, "
                        + "signing makes the PDF and rejecting does not."
                );
                break;
            case GatewayActionRouting.Unsupported unsupported:
                _todos.Add(
                    $"Did not add PDF service task '{pdfTaskId}' after task '{taskId}': gateway "
                        + $"'{unsupported.GatewayId}' after it routes on gatewayAction, and after a service task a "
                        + "gateway sees the service task's action instead of the user's, so no flow would match. "
                        + $"Add a 'pdf' service task '{pdfTaskId}' with autoPdfTaskIds '{taskId}' on the branch of "
                        + $"'{unsupported.GatewayId}' that should produce the PDF, and run the upgrade again."
                );
                _skippedTasks.Add(taskId);
                return;
        }

        var flowId = flow.Attribute("id")?.Value ?? throw new InvalidOperationException("sequenceFlow missing id");
        var flowSource =
            flow.Attribute("sourceRef")?.Value
            ?? throw new InvalidOperationException($"sequenceFlow '{flowId}' missing sourceRef");
        var originalTarget =
            flow.Attribute("targetRef")?.Value
            ?? throw new InvalidOperationException($"sequenceFlow '{flowId}' missing targetRef");

        var newFlowId = $"Flow_{pdfTaskId}_to_{originalTarget}";

        if (process.Elements().Any(e => e.Attribute("id")?.Value == newFlowId))
        {
            // Inserting a second element with this id would produce invalid (non-unique-id) BPMN.
            _warnings.Add(
                $"A sequence flow id '{newFlowId}' already exists. Skipped PDF service task insertion to avoid a "
                    + "duplicate id - please resolve the collision and add a 'pdf' service task manually."
            );
            _skippedTasks.Add(taskId);
            return;
        }

        // 1) Redirect the flow to the new pdf task.
        HasChanges = true;
        _insertedTasks.Add(taskId);
        flow.SetAttributeValue("targetRef", pdfTaskId);

        // 2) Create the pdf service task (S --flow--> PdfTask_T --newFlow--> X). New elements use the
        // document's own BPMN namespace so they stay part of the process even if it is nonstandard.
        var bpmnNs = process.Name.Namespace;
        var pdfTask = new XElement(
            bpmnNs + "serviceTask",
            new XAttribute("id", pdfTaskId),
            new XAttribute("name", "Lag PDF"),
            new XElement(
                bpmnNs + "extensionElements",
                new XElement(
                    _altinnNs + "taskExtension",
                    // No filenameTextResourceKey: reproduces the legacy default filename (the app title).
                    new XElement(_altinnNs + "taskType", "pdf"),
                    // autoPdfTaskIds points the pdf task at the source data task, so it renders that task's
                    // pages in summary mode, as the legacy PDF did for a task without a custom PDF layout. One
                    // task id only (no consolidation). A pdf task with a UI folder of its own renders the PDF
                    // from that folder instead, as the legacy PDF was rendered from the data task's, so it gets
                    // no autoPdfTaskIds.
                    hasOwnUiFolder
                        ? null
                        : new XElement(
                            _altinnNs + "pdfConfig",
                            new XElement(_altinnNs + "autoPdfTaskIds", new XElement(_altinnNs + "taskId", taskId))
                        )
                )
            ),
            new XElement(bpmnNs + "incoming", flowId),
            new XElement(bpmnNs + "outgoing", newFlowId)
        );

        // 3) New flow from the pdf task to the original target.
        var newFlow = new XElement(
            bpmnNs + "sequenceFlow",
            new XAttribute("id", newFlowId),
            new XAttribute("sourceRef", pdfTaskId),
            new XAttribute("targetRef", originalTarget)
        );

        flow.AddAfterSelf(newFlow);
        var source = process.Elements().FirstOrDefault(e => e.Attribute("id")?.Value == flowSource) ?? task;
        source.AddAfterSelf(pdfTask);

        // 4) Best-effort: repoint the original target's <incoming> hint from the old flow to the new one.
        var target = process.Elements().FirstOrDefault(e => e.Attribute("id")?.Value == originalTarget);
        var incomingHint = target?.Elements().FirstOrDefault(e => e.Name.LocalName == "incoming" && e.Value == flowId);
        incomingHint?.SetValue(newFlowId);

        // 5) Preserve gateway expression evaluation. Downstream exclusive gateways used to infer their
        // default data model from the data task's UI configuration (the process engine falls back to the
        // *current* task when no connectedDataTypeId is set) - with the pdf task in between, the current
        // task at evaluation time is the pdf task, which has no UI configuration. Pin the data task's
        // form data model explicitly on each gateway reachable through gateways from here.
        if (target is not null)
        {
            EnsureGatewayDataTypes(process, target, taskId, dataTypeId, visited: []);
        }

        // 6) Keep the diagram complete: add a shape for the pdf task and edges for both flows.
        if (plane is not null)
        {
            AddDiagramForPdfTask(plane, source, pdfTaskId, flowId, newFlowId, originalTarget);
        }
    }

    /// <summary>How a gateway routing on <c>gatewayAction</c> after a task decides where its pdf task goes.</summary>
    private abstract record GatewayActionRouting
    {
        /// <summary>No gateway after the task routes on <c>gatewayAction</c>.</summary>
        public sealed record None : GatewayActionRouting;

        /// <summary>
        /// A signing task is followed by gateway <paramref name="GatewayId"/>, which only splits on
        /// <c>sign</c> and <c>reject</c>: the pdf task goes on <paramref name="SignFlow"/>.
        /// </summary>
        public sealed record SignBranch(string GatewayId, XElement SignFlow) : GatewayActionRouting;

        /// <summary>
        /// Gateway <paramref name="GatewayId"/> routes on <c>gatewayAction</c> in a shape the upgrade cannot place a
        /// pdf task in.
        /// </summary>
        public sealed record Unsupported(string GatewayId) : GatewayActionRouting;
    }

    /// <summary>
    /// Finds a gateway that routes on <c>gatewayAction</c> after <paramref name="task"/>. A pdf task between them
    /// would break it: the process continues from a service task with the service task's action, not the user's.
    /// Only a signing task whose flow leads straight to a gateway with the plain sign and reject conditions, and
    /// nothing else entering it, has a branch to put the pdf task on instead: the sign branch, where v8 made the
    /// PDF.
    /// </summary>
    private static GatewayActionRouting FindGatewayActionRouting(XElement process, XElement task, XElement taskFlow)
    {
        var target = ElementById(process, taskFlow.Attribute("targetRef")?.Value);
        if (FindGatewayActionGateway(process, target, visited: []) is not { } gateway)
            return new GatewayActionRouting.None();

        var gatewayId = gateway.Attribute("id")?.Value ?? "";
        if (
            gateway == target
            && TaskTypeOf(task) == "signing"
            && gateway.Attribute("default") is null
            && FlowsWhere(process, "targetRef", gatewayId).Count == 1
            && FlowsWhere(process, "sourceRef", gatewayId) is { Count: 2 } flows
            && flows.Find(flow => HasCondition(flow, "sign")) is { } signFlow
            && flows.Exists(flow => flow != signFlow && HasCondition(flow, "reject"))
            && FindGatewayActionGateway(process, ElementById(process, signFlow.Attribute("targetRef")?.Value), [])
                is null
        )
        {
            return new GatewayActionRouting.SignBranch(gatewayId, signFlow);
        }

        return new GatewayActionRouting.Unsupported(gatewayId);
    }

    /// <summary>
    /// The first exclusive gateway that routes on <c>gatewayAction</c> from <paramref name="element"/> through
    /// consecutive exclusive gateways, which all evaluate with the action of the task before them.
    /// </summary>
    private static XElement? FindGatewayActionGateway(XElement process, XElement? element, HashSet<string> visited)
    {
        if (element?.Name.LocalName != "exclusiveGateway" || element.Attribute("id")?.Value is not { } gatewayId)
            return null;
        if (!visited.Add(gatewayId))
            return null;

        var outgoing = FlowsWhere(process, "sourceRef", gatewayId);
        if (outgoing.Exists(flow => ConditionOf(flow) is { } condition && ReferencesGatewayAction(condition)))
            return element;

        return outgoing
            .Select(flow =>
                FindGatewayActionGateway(process, ElementById(process, flow.Attribute("targetRef")?.Value), visited)
            )
            .FirstOrDefault(found => found is not null);
    }

    /// <summary>
    /// Whether the flow's condition is exactly <c>["equals",["gatewayAction"],"<paramref name="action"/>"]</c>.
    /// </summary>
    private static bool HasCondition(XElement flow, string action)
    {
        var expected = new JsonArray("equals", new JsonArray("gatewayAction"), action);
        return ConditionOf(flow) is { } condition
            && TryParseJson(condition) is { } parsed
            && JsonNode.DeepEquals(parsed, expected);
    }

    /// <summary>
    /// Whether an expression reads <c>["gatewayAction"]</c>. One that is not valid JSON counts when it mentions
    /// gatewayAction, since it is then unknown what it reads.
    /// </summary>
    private static bool ReferencesGatewayAction(string condition) =>
        TryParseJson(condition) is { } parsed
            ? ReadsGatewayAction(parsed)
            : condition.Contains("gatewayAction", StringComparison.Ordinal);

    private static bool ReadsGatewayAction(JsonNode? node)
    {
        if (node is not JsonArray array)
            return false;
        if (
            array.Count > 0
            && array[0] is JsonValue first
            && first.TryGetValue<string>(out var name)
            && name == "gatewayAction"
        )
            return true;

        return array.Any(ReadsGatewayAction);
    }

    private static JsonNode? TryParseJson(string text)
    {
        try
        {
            return JsonNode.Parse(text);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string? ConditionOf(XElement flow) =>
        flow.Elements().FirstOrDefault(e => e.Name.LocalName == "conditionExpression")?.Value;

    private static string? TaskTypeOf(XElement task) =>
        task.Descendants().FirstOrDefault(e => e.Name.LocalName == "taskType")?.Value.Trim();

    private static List<XElement> FlowsWhere(XElement process, string attribute, string elementId) =>
        process
            .Elements()
            .Where(e => e.Name.LocalName == "sequenceFlow" && e.Attribute(attribute)?.Value == elementId)
            .ToList();

    private static XElement? ElementById(XElement process, string? id) =>
        id is null ? null : process.Elements().FirstOrDefault(e => e.Attribute("id")?.Value == id);

    /// <summary>
    /// Walks from <paramref name="element"/> through consecutive exclusive gateways and pins
    /// <c>connectedDataTypeId</c> on each gateway that has conditional outgoing flows but no explicit
    /// data type. Non-gateway elements terminate the walk (their evaluation is unaffected by the
    /// inserted pdf task).
    /// </summary>
    private void EnsureGatewayDataTypes(
        XElement process,
        XElement element,
        string sourceTaskId,
        string? dataTypeId,
        HashSet<string> visited
    )
    {
        if (element.Name.LocalName != "exclusiveGateway")
            return;

        var gatewayId = element.Attribute("id")?.Value;
        if (gatewayId is null || !visited.Add(gatewayId))
            return;

        var outgoingFlows = process
            .Elements()
            .Where(e => e.Name.LocalName == "sequenceFlow" && e.Attribute("sourceRef")?.Value == gatewayId)
            .ToList();

        var hasConditions = outgoingFlows.Exists(f => f.Elements().Any(c => c.Name.LocalName == "conditionExpression"));

        if (hasConditions)
        {
            var extensionElements = element.Elements().FirstOrDefault(e => e.Name.LocalName == "extensionElements");
            var gatewayExtension = extensionElements
                ?.Elements()
                .FirstOrDefault(e => e.Name.LocalName == "gatewayExtension");
            var connectedDataType = gatewayExtension
                ?.Elements()
                .FirstOrDefault(e => e.Name.LocalName == "connectedDataTypeId");

            if (connectedDataType is null)
            {
                if (dataTypeId is null)
                {
                    _warnings.Add(
                        $"Gateway '{gatewayId}' evaluates expressions and previously inferred its data model "
                            + $"from task '{sourceTaskId}', which the inserted PDF service task now precedes. The "
                            + "data type could not be determined from applicationmetadata.json - please set "
                            + "<altinn:connectedDataTypeId> on the gateway manually."
                    );
                }
                else
                {
                    if (extensionElements is null)
                    {
                        extensionElements = new XElement(element.Name.Namespace + "extensionElements");
                        // Per the BPMN schema, extensionElements comes right after documentation.
                        var documentation = element.Elements().LastOrDefault(e => e.Name.LocalName == "documentation");
                        if (documentation is not null)
                            documentation.AddAfterSelf(extensionElements);
                        else
                            element.AddFirst(extensionElements);
                    }

                    if (gatewayExtension is null)
                    {
                        gatewayExtension = new XElement(_altinnNs + "gatewayExtension");
                        extensionElements.Add(gatewayExtension);
                    }

                    gatewayExtension.Add(new XElement(_altinnNs + "connectedDataTypeId", dataTypeId));
                    _warnings.Add(
                        $"Gateway '{gatewayId}' evaluates expressions and previously inferred its data model "
                            + $"from task '{sourceTaskId}', which the inserted PDF service task now precedes. Set "
                            + $"<altinn:connectedDataTypeId>{dataTypeId}</altinn:connectedDataTypeId> on the "
                            + "gateway to preserve that behavior - adjust it if the gateway expressions target "
                            + "a different data model."
                    );
                }
            }
        }

        foreach (var flow in outgoingFlows)
        {
            var targetRef = flow.Attribute("targetRef")?.Value;
            var next = targetRef is null
                ? null
                : process.Elements().FirstOrDefault(e => e.Attribute("id")?.Value == targetRef);
            if (next is not null)
                EnsureGatewayDataTypes(process, next, sourceTaskId, dataTypeId, visited);
        }
    }

    /// <summary>
    /// Adds a BPMNShape for the pdf task (placed below the task or gateway it follows) and BPMNEdges for
    /// the redirected and new sequence flows, so the diagram stays complete and valid. Placement is
    /// best-effort; the layout can be auto-arranged in Designer.
    /// </summary>
    private void AddDiagramForPdfTask(
        XElement plane,
        XElement source,
        string pdfTaskId,
        string flowId,
        string newFlowId,
        string targetId
    )
    {
        var sourceId = source.Attribute("id")?.Value ?? "";
        var sourceBounds = GetBounds(FindShape(plane, sourceId));
        if (sourceBounds is null)
        {
            var kind = source.Name.LocalName == "exclusiveGateway" ? "gateway" : "task";
            _warnings.Add(
                $"Could not find a diagram shape for {kind} '{sourceId}', so the diagram in process.bpmn is out of "
                    + $"date; skipped adding a shape for '{pdfTaskId}'. The process is valid but the diagram is "
                    + "incomplete - regenerate the layout in Designer."
            );
            return;
        }

        var (sx, sy, sw, sh) = sourceBounds.Value;
        int pdfX = (int)Math.Round(sx + sw / 2 - PdfShapeWidth / 2.0);
        int pdfY = (int)Math.Round(sy + sh + PdfShapeVerticalGap);

        // Shape for the pdf task.
        _addedShapes = true;
        plane.Add(
            new XElement(
                _bpmndiNs + "BPMNShape",
                new XAttribute("id", $"{pdfTaskId}_di"),
                new XAttribute("bpmnElement", pdfTaskId),
                Bounds(pdfX, pdfY, PdfShapeWidth, PdfShapeHeight)
            )
        );

        // Redirect the source task's existing edge to end at the pdf task (straight line down).
        int sourceBottomX = (int)Math.Round(sx + sw / 2);
        int sourceBottomY = (int)Math.Round(sy + sh);
        int pdfTopX = pdfX + PdfShapeWidth / 2;
        var existingEdge = FindEdge(plane, flowId);
        if (existingEdge is not null)
        {
            existingEdge.Elements().Where(e => e.Name.LocalName == "waypoint").Remove();
            existingEdge.Add(Waypoint(sourceBottomX, sourceBottomY), Waypoint(pdfTopX, pdfY));
        }

        // New edge from the pdf task to the original target.
        int pdfRightX = pdfX + PdfShapeWidth;
        int pdfMidY = pdfY + PdfShapeHeight / 2;
        var targetBounds = GetBounds(FindShape(plane, targetId));
        var (targetX, targetY) = targetBounds is { } tb
            ? ((int)Math.Round(tb.X), (int)Math.Round(tb.Y + tb.Height / 2))
            : (pdfRightX + 80, pdfMidY);

        plane.Add(
            new XElement(
                _bpmndiNs + "BPMNEdge",
                new XAttribute("id", $"{newFlowId}_di"),
                new XAttribute("bpmnElement", newFlowId),
                Waypoint(pdfRightX, pdfMidY),
                Waypoint(targetX, targetY)
            )
        );
    }

    private static bool IsPdfServiceTask(XElement element) =>
        element.Name.LocalName == "serviceTask"
        && element.Descendants().Any(e => e.Name.LocalName == "taskType" && e.Value == "pdf");

    private XElement? FindShape(XElement plane, string bpmnElement) =>
        plane
            .Elements()
            .FirstOrDefault(e => e.Name.LocalName == "BPMNShape" && e.Attribute("bpmnElement")?.Value == bpmnElement);

    private XElement? FindEdge(XElement plane, string bpmnElement) =>
        plane
            .Elements()
            .FirstOrDefault(e => e.Name.LocalName == "BPMNEdge" && e.Attribute("bpmnElement")?.Value == bpmnElement);

    private (double X, double Y, double Width, double Height)? GetBounds(XElement? shape)
    {
        var bounds = shape?.Elements().FirstOrDefault(e => e.Name.LocalName == "Bounds");
        if (
            bounds is null
            || !TryParse(bounds.Attribute("x"), out var x)
            || !TryParse(bounds.Attribute("y"), out var y)
            || !TryParse(bounds.Attribute("width"), out var w)
            || !TryParse(bounds.Attribute("height"), out var h)
        )
        {
            return null;
        }

        return (x, y, w, h);
    }

    private static bool TryParse(XAttribute? attr, out double value)
    {
        value = 0;
        return attr is not null
            && double.TryParse(attr.Value, NumberStyles.Float, CultureInfo.InvariantCulture, out value);
    }

    private XElement Bounds(int x, int y, int width, int height) =>
        new(
            _dcNs + "Bounds",
            new XAttribute("x", x.ToString(CultureInfo.InvariantCulture)),
            new XAttribute("y", y.ToString(CultureInfo.InvariantCulture)),
            new XAttribute("width", width.ToString(CultureInfo.InvariantCulture)),
            new XAttribute("height", height.ToString(CultureInfo.InvariantCulture))
        );

    private XElement Waypoint(int x, int y) =>
        new(
            _diNs + "waypoint",
            new XAttribute("x", x.ToString(CultureInfo.InvariantCulture)),
            new XAttribute("y", y.ToString(CultureInfo.InvariantCulture))
        );

    /// <summary>
    /// Serializes the document back to the process file, preserving the source file's encoding
    /// (UTF-8, BOM iff the source had one), newline style and trailing-newline presence.
    /// </summary>
    public async Task Write()
    {
        var settings = new XmlWriterSettings
        {
            Async = true,
            OmitXmlDeclaration = false,
            Indent = true,
            // Keep the source newline style rather than the platform default, so the rewrite does
            // not churn every line ending of the file.
            NewLineChars = _newline,
            // Only emit a UTF-8 BOM if the source file had one, so the rewrite does not change encoding.
            Encoding = new UTF8Encoding(encoderShouldEmitUTF8Identifier: _sourceHadBom),
        };

        using var buffer = new MemoryStream();
        await using (var writer = XmlWriter.Create(buffer, settings))
        {
            await _doc.WriteToAsync(writer, CancellationToken.None);
        }

        // XmlWriter does not end the document with a newline; restore it if the source had one.
        if (_hadTrailingNewline)
            await buffer.WriteAsync(Encoding.UTF8.GetBytes(_newline));

        await File.WriteAllBytesAsync(_processFile, buffer.ToArray());
    }
}
