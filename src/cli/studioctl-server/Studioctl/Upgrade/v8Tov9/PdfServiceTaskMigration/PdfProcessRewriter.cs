using System.Globalization;
using System.Text;
using System.Xml;
using System.Xml.Linq;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.PdfServiceTaskMigration;

/// <summary>
/// Rewrites a process.bpmn file to add a <c>pdf</c> service task after each task that previously
/// relied on the deprecated <c>enablePdfCreation</c> flag in applicationmetadata.json.
///
/// The legacy flag generated one PDF at the end of the task a pdf-enabled datamodel was bound to.
/// The faithful equivalent is a <c>pdf</c> service task inserted immediately after that task:
/// <c>T --flow--> X</c> becomes <c>T --flow--> PdfTask_T --newFlow--> X</c>.
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
    private readonly List<string> _skippedTasks = new();
    private readonly bool _sourceHadBom;
    private readonly string _newline;
    private readonly bool _hadTrailingNewline;

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

    /// <summary>Whether any insertion actually changed the document; false means nothing to write.</summary>
    public bool HasChanges { get; private set; }

    /// <summary>
    /// Task ids for which a PDF service task could not be inserted (task missing or ambiguous flow).
    /// A task whose PDF service task already exists (e.g. from a previous migration run) counts as
    /// satisfied, not skipped. When this is non-empty the caller must not strip the legacy flag,
    /// or the app would end up with neither the v8 flag nor the v9 service task.
    /// </summary>
    public IReadOnlyList<string> GetSkippedTasks() => _skippedTasks;

    /// <summary>
    /// Inserts a pdf service task after each of the given tasks. The paired dataType id (the task's
    /// form data model) is used to pin <c>connectedDataTypeId</c> on any downstream gateway whose
    /// expressions previously inferred their data model from the data task. Changes are held in
    /// memory until <see cref="Write"/> is called.
    /// </summary>
    public void InsertPdfServiceTasks(IReadOnlyCollection<(string TaskId, string? DataTypeId)> tasks)
    {
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
            InsertPdfServiceTaskAfter(process, plane, taskId, dataTypeId);
        }

        if (plane is not null && HasChanges)
        {
            _warnings.Add(
                "The process has a BPMN diagram. Diagram shapes for the inserted PDF service task(s) were "
                    + "added below their source tasks with best-effort placement - open the process in Altinn "
                    + "Studio Designer to auto-arrange the layout if desired."
            );
        }
    }

    private void InsertPdfServiceTaskAfter(XElement process, XElement? plane, string taskId, string? dataTypeId)
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

        var flow = outgoingFlows[0];
        var flowId = flow.Attribute("id")?.Value ?? throw new InvalidOperationException("sequenceFlow missing id");
        var originalTarget =
            flow.Attribute("targetRef")?.Value
            ?? throw new InvalidOperationException($"sequenceFlow '{flowId}' missing targetRef");

        var pdfTaskId = $"PdfTask_{taskId}";
        var newFlowId = $"Flow_{pdfTaskId}_to_{originalTarget}";

        if (process.Elements().Any(e => e.Attribute("id")?.Value == pdfTaskId))
        {
            // Satisfied, not skipped: the task already has its PDF service task (typically from a
            // previous migration run), so re-running the migration can safely strip the legacy flag.
            _warnings.Add(
                $"An element with id '{pdfTaskId}' already exists; treating task '{taskId}' as already migrated."
            );
            return;
        }

        // 1) Redirect the task's existing outgoing flow to the new pdf task.
        HasChanges = true;
        flow.SetAttributeValue("targetRef", pdfTaskId);

        // 2) Create the pdf service task (T --flow--> PdfTask_T --newFlow--> X). New elements use the
        // document's own BPMN namespace so they stay part of the process even if it is nonstandard.
        var bpmnNs = process.Name.Namespace;
        var pdfTask = new XElement(
            bpmnNs + "serviceTask",
            new XAttribute("id", pdfTaskId),
            new XAttribute("name", "Generate PDF"),
            new XElement(
                bpmnNs + "extensionElements",
                new XElement(
                    _altinnNs + "taskExtension",
                    // No filenameTextResourceKey: reproduces the legacy default filename (the app title).
                    new XElement(_altinnNs + "taskType", "pdf"),
                    // A pdf service task has no form layout of its own. autoPdfTaskIds points it at the
                    // source data task so it renders that task's main layout in summary mode - the faithful
                    // equivalent of the legacy enablePdfCreation flag. One task id only (no consolidation).
                    new XElement(
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
        task.AddAfterSelf(pdfTask);

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
            AddDiagramForPdfTask(plane, taskId, pdfTaskId, flowId, newFlowId, originalTarget);
        }
    }

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
                            + "gateway to preserve that behaviour - adjust it if the gateway expressions target "
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
    /// Adds a BPMNShape for the pdf task (placed below its source task) and BPMNEdges for the
    /// redirected and new sequence flows, so the diagram stays complete and valid. Placement is
    /// best-effort; the layout can be auto-arranged in Designer.
    /// </summary>
    private void AddDiagramForPdfTask(
        XElement plane,
        string sourceTaskId,
        string pdfTaskId,
        string flowId,
        string newFlowId,
        string targetId
    )
    {
        var sourceBounds = GetBounds(FindShape(plane, sourceTaskId));
        if (sourceBounds is null)
        {
            _warnings.Add(
                $"Could not find a diagram shape for task '{sourceTaskId}'; skipped adding a shape for "
                    + $"'{pdfTaskId}'. The process is valid but the diagram is incomplete - regenerate the "
                    + "layout in Designer."
            );
            return;
        }

        var (sx, sy, sw, sh) = sourceBounds.Value;
        int pdfX = (int)Math.Round(sx + sw / 2 - PdfShapeWidth / 2.0);
        int pdfY = (int)Math.Round(sy + sh + PdfShapeVerticalGap);

        // Shape for the pdf task.
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
