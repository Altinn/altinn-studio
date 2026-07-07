using System.Globalization;
using System.Text;
using System.Xml;
using System.Xml.Linq;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.EFormidlingServiceTaskMigration;

/// <summary>
/// Outcome of the eFormidling service task insertion.
/// </summary>
internal enum EFormidlingInsertResult
{
    /// <summary>The service task was inserted; the caller must write the document and may strip the legacy config.</summary>
    Inserted,

    /// <summary>The service task already existed (e.g. from a previous run); the legacy config can be stripped.</summary>
    AlreadyPresent,

    /// <summary>The task could not be inserted; the caller must keep the legacy config so nothing is lost.</summary>
    Skipped,
}

/// <summary>
/// Rewrites a process.bpmn file to add an <c>eFormidling</c> service task after the task the
/// deprecated applicationmetadata.json configuration pointed at with <c>sendAfterTaskId</c>.
///
/// The legacy backend sent the shipment at the end of that task, after generating any legacy PDF for
/// it. When the PDF migration (Job 8) has inserted a <c>PdfTask_&lt;taskId&gt;</c> after the same
/// task, the eFormidling task is therefore placed after the PDF task, preserving the legacy ordering
/// (and any <c>ref-data-as-pdf</c> attachment in the shipment).
///
/// Mirrors the approach of <c>PdfServiceTaskMigration.PdfProcessRewriter</c>: rely on
/// <c>sequenceFlow</c> <c>sourceRef</c>/<c>targetRef</c>, treat <c>&lt;incoming&gt;</c>/
/// <c>&lt;outgoing&gt;</c> hints as best-effort, pin gateway data types, and keep the diagram
/// complete.
/// </summary>
internal sealed class EFormidlingProcessRewriter
{
    private readonly XDocument _doc;
    private readonly string _processFile;
    private readonly XNamespace _altinnNs = "http://altinn.no/process";
    private readonly XNamespace _bpmnNs = "http://www.omg.org/spec/BPMN/20100524/MODEL";
    private readonly XNamespace _bpmndiNs = "http://www.omg.org/spec/BPMN/20100524/DI";
    private readonly XNamespace _dcNs = "http://www.omg.org/spec/DD/20100524/DC";
    private readonly XNamespace _diNs = "http://www.omg.org/spec/DD/20100524/DI";
    private readonly List<string> _warnings = new();
    private readonly bool _sourceHadBom;

    // Standard bpmn.io task shape size and the vertical gap below the anchor task.
    private const int ShapeWidth = 100;
    private const int ShapeHeight = 80;
    private const int ShapeVerticalGap = 60;

    public EFormidlingProcessRewriter(string processFile)
    {
        _processFile = processFile;
        var bytes = File.ReadAllBytes(processFile);
        _sourceHadBom = bytes.Length >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF;
        // XDocument.Parse rejects a leading BOM character, so decode past it.
        _doc = XDocument.Parse(
            _sourceHadBom ? Encoding.UTF8.GetString(bytes, 3, bytes.Length - 3) : Encoding.UTF8.GetString(bytes)
        );
    }

    public IReadOnlyList<string> GetWarnings() => _warnings;

    /// <summary>
    /// Inserts the eFormidling service task after <paramref name="sendAfterTaskId"/> (or after the
    /// PDF service task the PDF migration inserted for that task). The optional
    /// <paramref name="gatewayDataTypeId"/> (the task's form data model) is used to pin
    /// <c>connectedDataTypeId</c> on downstream gateways whose expressions previously inferred their
    /// data model from the task. Changes are held in memory until <see cref="Write"/> is called.
    /// </summary>
    public EFormidlingInsertResult InsertEFormidlingServiceTask(
        string sendAfterTaskId,
        string? gatewayDataTypeId,
        LegacyEFormidlingConfiguration config,
        EFormidlingGate gate
    )
    {
        var process =
            _doc.Root?.Elements().SingleOrDefault(e => e.Name.LocalName == "process")
            ?? throw new InvalidOperationException("process.bpmn does not contain a <process> element");

        var plane = _doc.Descendants().FirstOrDefault(e => e.Name.LocalName == "BPMNPlane");

        var eFormidlingTaskId = $"EFormidlingTask_{sendAfterTaskId}";
        if (process.Elements().Any(e => e.Attribute("id")?.Value == eFormidlingTaskId))
        {
            // Satisfied, not skipped: typically from a previous migration run, so re-running the
            // migration can safely strip the legacy configuration.
            _warnings.Add(
                $"An element with id '{eFormidlingTaskId}' already exists; treating task '{sendAfterTaskId}' "
                    + "as already migrated."
            );
            return EFormidlingInsertResult.AlreadyPresent;
        }

        WarnAboutExistingEFormidlingTasks(process);

        var anchor = process.Elements().SingleOrDefault(e => e.Attribute("id")?.Value == sendAfterTaskId);
        if (anchor is null)
        {
            _warnings.Add(
                $"Task '{sendAfterTaskId}' (the legacy eFormidling sendAfterTaskId) was not found in the "
                    + "process file. Skipped eFormidling service task insertion."
            );
            return EFormidlingInsertResult.Skipped;
        }

        // The legacy pipeline generated the task's PDF before sending the eFormidling shipment. If
        // the PDF migration inserted a PDF service task after this task, anchor behind it so the
        // ordering (and a ref-data-as-pdf attachment in the shipment) is preserved.
        var pdfTaskId = $"PdfTask_{sendAfterTaskId}";
        var anchorFlows = GetOutgoingFlows(process, sendAfterTaskId);
        if (anchorFlows.Count == 1 && anchorFlows[0].Attribute("targetRef")?.Value == pdfTaskId)
        {
            var pdfTask = process.Elements().SingleOrDefault(e => e.Attribute("id")?.Value == pdfTaskId);
            if (pdfTask is not null)
            {
                anchor = pdfTask;
                anchorFlows = GetOutgoingFlows(process, pdfTaskId);
            }
        }

        var anchorId = anchor.Attribute("id")?.Value ?? throw new InvalidOperationException("anchor task missing id");

        if (anchorFlows.Count != 1)
        {
            _warnings.Add(
                $"Task '{anchorId}' has {anchorFlows.Count} outgoing sequence flows (expected exactly 1). "
                    + "Skipped automatic eFormidling service task insertion - please add an 'eFormidling' "
                    + "service task manually."
            );
            return EFormidlingInsertResult.Skipped;
        }

        var flow = anchorFlows[0];
        var flowId = flow.Attribute("id")?.Value ?? throw new InvalidOperationException("sequenceFlow missing id");
        var originalTarget =
            flow.Attribute("targetRef")?.Value
            ?? throw new InvalidOperationException($"sequenceFlow '{flowId}' missing targetRef");

        var newFlowId = $"Flow_{eFormidlingTaskId}_to_{originalTarget}";

        // 1) Redirect the anchor's existing outgoing flow to the new eFormidling task.
        flow.SetAttributeValue("targetRef", eFormidlingTaskId);

        // 2) Create the eFormidling service task (A --flow--> EFormidlingTask --newFlow--> X).
        var eFormidlingTask = new XElement(
            _bpmnNs + "serviceTask",
            new XAttribute("id", eFormidlingTaskId),
            new XAttribute("name", "Send eFormidling"),
            new XElement(
                _bpmnNs + "extensionElements",
                new XElement(
                    _altinnNs + "taskExtension",
                    new XElement(_altinnNs + "taskType", "eFormidling"),
                    BuildEFormidlingConfig(config, gate)
                )
            ),
            new XElement(_bpmnNs + "incoming", flowId),
            new XElement(_bpmnNs + "outgoing", newFlowId)
        );

        // 3) New flow from the eFormidling task to the original target.
        var newFlow = new XElement(
            _bpmnNs + "sequenceFlow",
            new XAttribute("id", newFlowId),
            new XAttribute("sourceRef", eFormidlingTaskId),
            new XAttribute("targetRef", originalTarget)
        );

        flow.AddAfterSelf(newFlow);
        anchor.AddAfterSelf(eFormidlingTask);

        // 4) Best-effort: repoint the original target's <incoming> hint from the old flow to the new one.
        var target = process.Elements().SingleOrDefault(e => e.Attribute("id")?.Value == originalTarget);
        var incomingHint = target?.Elements().FirstOrDefault(e => e.Name.LocalName == "incoming" && e.Value == flowId);
        incomingHint?.SetValue(newFlowId);

        // 5) Preserve gateway expression evaluation. Downstream exclusive gateways used to infer
        // their default data model from the data task's UI configuration (the process engine falls
        // back to the *current* task when no connectedDataTypeId is set) - with the eFormidling task
        // in between, the current task at evaluation time is the eFormidling task, which has no UI
        // configuration. Pin the data task's form data model explicitly on each gateway reachable
        // through gateways from here.
        if (target is not null)
        {
            EnsureGatewayDataTypes(process, target, sendAfterTaskId, gatewayDataTypeId, visited: []);
        }

        // 6) Keep the diagram complete: add a shape for the task and edges for both flows.
        if (plane is not null)
        {
            AddDiagramForServiceTask(plane, anchorId, eFormidlingTaskId, flowId, newFlowId, originalTarget);
            _warnings.Add(
                "The process has a BPMN diagram. The diagram shape for the inserted eFormidling service task "
                    + "was added below its source task with best-effort placement - open the process in Altinn "
                    + "Studio Designer to auto-arrange the layout if desired."
            );
        }

        return EFormidlingInsertResult.Inserted;
    }

    /// <summary>
    /// Builds the <c>&lt;altinn:eFormidlingConfig&gt;</c> element from the legacy configuration. The
    /// legacy AppSettings:EnableEFormidling gate is expressed with <c>&lt;altinn:disabled&gt;</c>
    /// elements, so the migrated app keeps sending (or not sending) exactly where it did before.
    /// Values the v9 configuration requires but the legacy block lacks are reported as warnings; the
    /// service task fails configuration validation at runtime until they are filled in.
    /// </summary>
    private XElement BuildEFormidlingConfig(LegacyEFormidlingConfiguration config, EFormidlingGate gate)
    {
        var configElement = new XElement(_altinnNs + "eFormidlingConfig");

        if (!gate.EnabledAnywhere)
        {
            configElement.Add(new XElement(_altinnNs + "disabled", "true"));
        }
        else if (!gate.EnabledEverywhere)
        {
            foreach (var env in gate.DisabledEnvironments())
            {
                configElement.Add(new XElement(_altinnNs + "disabled", new XAttribute("env", env), "true"));
            }
        }

        AddIfPresent(configElement, "receiver", config.Receiver);
        AddIfPresent(configElement, "process", config.Process);
        AddIfPresent(configElement, "standard", config.Standard);
        AddIfPresent(configElement, "typeVersion", config.TypeVersion);
        AddIfPresent(configElement, "type", config.Type);
        AddIfPresent(configElement, "securityLevel", config.SecurityLevel);
        AddIfPresent(configElement, "dpfShipmentType", config.DpfShipmentType);

        if (config.DataTypes.Count > 0)
        {
            var dataTypes = new XElement(_altinnNs + "dataTypes");
            foreach (var dataType in config.DataTypes)
            {
                dataTypes.Add(new XElement(_altinnNs + "dataType", dataType));
            }
            configElement.Add(dataTypes);
        }

        var missingRequired = new List<string>();
        if (config.Process is null)
            missingRequired.Add("process");
        if (config.Standard is null)
            missingRequired.Add("standard");
        if (config.TypeVersion is null)
            missingRequired.Add("typeVersion");
        if (config.Type is null)
            missingRequired.Add("type");
        if (config.SecurityLevel is null)
            missingRequired.Add("securityLevel");

        if (missingRequired.Count > 0)
        {
            _warnings.Add(
                $"The legacy eFormidling configuration is missing value(s) the v9 service task requires: "
                    + $"[{string.Join(", ", missingRequired)}]. The service task was added without them and "
                    + "will fail configuration validation at runtime - set the missing "
                    + "<altinn:eFormidlingConfig> element(s) in process.bpmn."
            );
        }

        return configElement;
    }

    private void AddIfPresent(XElement configElement, string elementName, string? value)
    {
        if (value is not null)
            configElement.Add(new XElement(_altinnNs + elementName, value));
    }

    /// <summary>
    /// The process may already contain eFormidling service tasks (supported since late v8). The
    /// legacy configuration would have sent its own shipment in addition to those tasks, so the
    /// migrated task is still inserted - but flag the situation for review.
    /// </summary>
    private void WarnAboutExistingEFormidlingTasks(XElement process)
    {
        var existing = process
            .Elements()
            .Where(e =>
                e.Name.LocalName == "serviceTask"
                && e.Descendants(_altinnNs + "taskType").Any(t => t.Value.Trim() == "eFormidling")
            )
            .Select(e => e.Attribute("id")?.Value)
            .Where(id => id is not null)
            .ToList();

        if (existing.Count > 0)
        {
            _warnings.Add(
                $"The process already contains eFormidling service task(s) [{string.Join(", ", existing)}]. "
                    + "The legacy configuration in applicationmetadata.json would have sent a shipment in "
                    + "addition to those tasks, so a migrated service task was still inserted - remove one of "
                    + "them if a single shipment is intended."
            );
        }
    }

    private static List<XElement> GetOutgoingFlows(XElement process, string sourceId) =>
        process
            .Elements()
            .Where(e => e.Name.LocalName == "sequenceFlow" && e.Attribute("sourceRef")?.Value == sourceId)
            .ToList();

    /// <summary>
    /// Walks from <paramref name="element"/> through consecutive exclusive gateways and pins
    /// <c>connectedDataTypeId</c> on each gateway that has conditional outgoing flows but no explicit
    /// data type. Non-gateway elements terminate the walk (their evaluation is unaffected by the
    /// inserted eFormidling task).
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

        var outgoingFlows = GetOutgoingFlows(process, gatewayId);

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
                            + $"from task '{sourceTaskId}', which the inserted eFormidling service task now "
                            + "precedes. The data type could not be determined from applicationmetadata.json - "
                            + "please set <altinn:connectedDataTypeId> on the gateway manually."
                    );
                }
                else
                {
                    if (extensionElements is null)
                    {
                        extensionElements = new XElement(_bpmnNs + "extensionElements");
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
                            + $"from task '{sourceTaskId}', which the inserted eFormidling service task now "
                            + $"precedes. Set <altinn:connectedDataTypeId>{dataTypeId}</altinn:connectedDataTypeId> "
                            + "on the gateway to preserve that behaviour - adjust it if the gateway expressions "
                            + "target a different data model."
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
    /// Adds a BPMNShape for the service task (placed below its anchor task) and BPMNEdges for the
    /// redirected and new sequence flows, so the diagram stays complete and valid. Placement is
    /// best-effort; the layout can be auto-arranged in Designer.
    /// </summary>
    private void AddDiagramForServiceTask(
        XElement plane,
        string anchorTaskId,
        string serviceTaskId,
        string flowId,
        string newFlowId,
        string targetId
    )
    {
        var anchorBounds = GetBounds(FindShape(plane, anchorTaskId));
        if (anchorBounds is null)
        {
            _warnings.Add(
                $"Could not find a diagram shape for task '{anchorTaskId}'; skipped adding a shape for "
                    + $"'{serviceTaskId}'. The process is valid but the diagram is incomplete - regenerate the "
                    + "layout in Designer."
            );
            return;
        }

        var (sx, sy, sw, sh) = anchorBounds.Value;
        int taskX = (int)Math.Round(sx + sw / 2 - ShapeWidth / 2.0);
        int taskY = (int)Math.Round(sy + sh + ShapeVerticalGap);

        // Shape for the service task.
        plane.Add(
            new XElement(
                _bpmndiNs + "BPMNShape",
                new XAttribute("id", $"{serviceTaskId}_di"),
                new XAttribute("bpmnElement", serviceTaskId),
                Bounds(taskX, taskY, ShapeWidth, ShapeHeight)
            )
        );

        // Redirect the anchor task's existing edge to end at the service task (straight line down).
        int anchorBottomX = (int)Math.Round(sx + sw / 2);
        int anchorBottomY = (int)Math.Round(sy + sh);
        int taskTopX = taskX + ShapeWidth / 2;
        var existingEdge = FindEdge(plane, flowId);
        if (existingEdge is not null)
        {
            existingEdge.Elements().Where(e => e.Name.LocalName == "waypoint").Remove();
            existingEdge.Add(Waypoint(anchorBottomX, anchorBottomY), Waypoint(taskTopX, taskY));
        }

        // New edge from the service task to the original target.
        int taskRightX = taskX + ShapeWidth;
        int taskMidY = taskY + ShapeHeight / 2;
        var targetBounds = GetBounds(FindShape(plane, targetId));
        var (targetX, targetY) = targetBounds is { } tb
            ? ((int)Math.Round(tb.X), (int)Math.Round(tb.Y + tb.Height / 2))
            : (taskRightX + 80, taskMidY);

        plane.Add(
            new XElement(
                _bpmndiNs + "BPMNEdge",
                new XAttribute("id", $"{newFlowId}_di"),
                new XAttribute("bpmnElement", newFlowId),
                Waypoint(taskRightX, taskMidY),
                Waypoint(targetX, targetY)
            )
        );
    }

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

    public async Task Write()
    {
        var settings = new XmlWriterSettings
        {
            Async = true,
            OmitXmlDeclaration = false,
            Indent = true,
            // Only emit a UTF-8 BOM if the source file had one, so the rewrite does not change encoding.
            Encoding = new UTF8Encoding(encoderShouldEmitUTF8Identifier: _sourceHadBom),
        };
        await using var writer = XmlWriter.Create(_processFile, settings);
        await _doc.WriteToAsync(writer, CancellationToken.None);
    }
}
