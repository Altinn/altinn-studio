using System.Xml.Linq;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Altinn.Studio.Cli.Upgrade.v8Tov9.PdfServiceTaskMigration;
using static Studioctl.Tests.Upgrade.v8Tov9.BpmnBuilder;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// After a service task, a gateway sees the service task's action instead of the user's, so a PDF service task
/// must not come between a task and a gateway that routes on gatewayAction. Task_2 is a signing task with a PDF,
/// followed by Gateway_1, which goes on to EndEvent_1 on sign and back to Task_1 on reject.
/// </summary>
public sealed class PdfServiceTaskGatewayActionTests : IDisposable
{
    private const string Sign = """["equals",["gatewayAction"],"sign"]""";
    private const string Reject = """["equals",["gatewayAction"],"reject"]""";

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private async Task<MigrationResult> Migrate() =>
        await new PdfServiceTaskMigrator(_app.Root, new CSharpSourceScanner(Path.Combine(_app.Root, "App"))).Migrate();

    private void WriteMetadata() =>
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(
                FormDataType("model", "Task_1", enablePdfCreation: false),
                FormDataType("receipt", "Task_2", enablePdfCreation: true)
            )
        );

    private static string[] Elements(
        string taskType = "signing",
        string signCondition = Sign,
        string rejectCondition = Reject,
        string gateway = """    <bpmn:exclusiveGateway id="Gateway_1" />"""
    ) =>
        [
            Task("Task_1", "data"),
            Task("Task_2", taskType),
            gateway,
            EndEvent("EndEvent_1"),
            Flow("Flow_1", "Task_1", "Task_2"),
            Flow("Flow_to_gw", "Task_2", "Gateway_1"),
            ConditionalFlow("Flow_sign", "Gateway_1", "EndEvent_1", signCondition),
            ConditionalFlow("Flow_reject", "Gateway_1", "Task_1", rejectCondition),
        ];

    private XElement ProcessAfter() =>
        XDocument
            .Parse(_app.Read("config/process/process.bpmn"))
            .Root?.Elements()
            .Single(e => e.Name.LocalName == "process")
        ?? throw new InvalidOperationException("process.bpmn has no root element");

    private static XElement? ElementById(XElement parent, string id) =>
        parent.Elements().FirstOrDefault(e => e.Attribute("id")?.Value == id);

    private static string? TargetOf(XElement process, string flowId) =>
        ElementById(process, flowId)?.Attribute("targetRef")?.Value;

    private static string WithDiagram(string process, params string[] diagramElements) =>
        process.Replace(
            "</bpmn:definitions>",
            "  <bpmndi:BPMNDiagram id=\"BPMNDiagram_1\">\n"
                + "    <bpmndi:BPMNPlane id=\"BPMNPlane_1\" bpmnElement=\"Process_1\">\n"
                + string.Join("\n", diagramElements)
                + "\n    </bpmndi:BPMNPlane>\n  </bpmndi:BPMNDiagram>\n</bpmn:definitions>",
            StringComparison.Ordinal
        );

    private static string Shape(string id, int x, int y, int width, int height) =>
        $"      <bpmndi:BPMNShape id=\"{id}_di\" bpmnElement=\"{id}\"><dc:Bounds x=\"{x}\" y=\"{y}\" width=\"{width}\" height=\"{height}\" /></bpmndi:BPMNShape>";

    private static string Edge(string id, int x1, int y1, int x2, int y2) =>
        $"      <bpmndi:BPMNEdge id=\"{id}_di\" bpmnElement=\"{id}\"><di:waypoint x=\"{x1}\" y=\"{y1}\" /><di:waypoint x=\"{x2}\" y=\"{y2}\" /></bpmndi:BPMNEdge>";

    [Fact]
    public async Task SigningTaskWithSignAndRejectGateway_GetsThePdfTaskOnTheSignBranch()
    {
        WriteMetadata();
        _app.Write("config/process/process.bpmn", Process(Elements()));

        var result = await Migrate();

        var process = ProcessAfter();
        Assert.Equal("Gateway_1", TargetOf(process, "Flow_to_gw"));
        Assert.Equal("PdfTask_Task_2", TargetOf(process, "Flow_sign"));
        Assert.Equal("EndEvent_1", TargetOf(process, "Flow_PdfTask_Task_2_to_EndEvent_1"));
        Assert.Equal(
            "PdfTask_Task_2",
            ElementById(process, "Flow_PdfTask_Task_2_to_EndEvent_1")?.Attribute("sourceRef")?.Value
        );
        Assert.Equal("Task_1", TargetOf(process, "Flow_reject"));
        var pdfTask = ElementById(process, "PdfTask_Task_2");
        Assert.NotNull(pdfTask);
        Assert.Equal("Task_2", pdfTask.Descendants().Single(e => e.Name.LocalName == "taskId").Value);
        Assert.Empty(result.Todos);
        var info = Assert.Single(result.Messages, m => m.Status == UpgradeMessageStatus.Info);
        Assert.Equal(
            "Put PDF service task 'PdfTask_Task_2' on the sign branch of gateway 'Gateway_1', which routes on "
                + "gatewayAction after signing task 'Task_2'. As in v8, signing makes the PDF and rejecting does not.",
            info.Text
        );
        Assert.DoesNotContain(
            "enablePdfCreation",
            _app.Read("config/applicationmetadata.json"),
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task SignBranchFlowIdCollision_SkipsTheTask_AndReportsNoPlacement()
    {
        WriteMetadata();
        _app.Write(
            "config/process/process.bpmn",
            Process([.. Elements(), Flow("Flow_PdfTask_Task_2_to_EndEvent_1", "Task_1", "EndEvent_1")])
        );

        var result = await Migrate();

        Assert.Equal("EndEvent_1", TargetOf(ProcessAfter(), "Flow_sign"));
        Assert.Contains(
            result.Warnings,
            w =>
                w.StartsWith(
                    "A sequence flow id 'Flow_PdfTask_Task_2_to_EndEvent_1' already exists.",
                    StringComparison.Ordinal
                )
        );
        Assert.DoesNotContain(result.Messages, m => m.Status == UpgradeMessageStatus.Info);
    }

    [Fact]
    public async Task SignAndRejectConditions_AreComparedAsJson()
    {
        WriteMetadata();
        _app.Write(
            "config/process/process.bpmn",
            Process(
                Elements(
                    signCondition: "\n  [ \"equals\", [ \"gatewayAction\" ],\n    \"sign\" ]\n",
                    rejectCondition: "[\"equals\", [\"gatewayAction\"], \"reject\"]"
                )
            )
        );

        var result = await Migrate();

        Assert.Equal("PdfTask_Task_2", TargetOf(ProcessAfter(), "Flow_sign"));
        Assert.Empty(result.Todos);
    }

    public static TheoryData<string, string[]> OtherShapes =>
        new()
        {
            { "data task", Elements(taskType: "data") },
            { "two sign flows", Elements(rejectCondition: Sign) },
            {
                "conditions that are not JSON",
                Elements(signCondition: "gatewayAction == 'sign'", rejectCondition: "gatewayAction == 'reject'")
            },
            { "other actions", Elements(signCondition: """["equals",["gatewayAction"],"confirm"]""") },
            {
                "condition beyond the action",
                Elements(signCondition: """["and",["equals",["gatewayAction"],"sign"],["dataModel","ok"]]""")
            },
            {
                "default flow",
                Elements(gateway: """    <bpmn:exclusiveGateway id="Gateway_1" default="Flow_reject" />""")
            },
            {
                "third flow",
                [
                    .. Elements(),
                    ConditionalFlow("Flow_other", "Gateway_1", "EndEvent_2", """["equals",["dataModel","x"],true]"""),
                    EndEvent("EndEvent_2"),
                ]
            },
            {
                "second incoming flow",
                [.. Elements(), StartEvent("StartEvent_1"), Flow("Flow_start", "StartEvent_1", "Gateway_1")]
            },
            {
                "gateway between",
                [
                    .. Elements()
                        .Select(e =>
                            e.Replace(
                                "id=\"Flow_to_gw\" sourceRef=\"Task_2\"",
                                "id=\"Flow_to_gw\" sourceRef=\"Gateway_0\"",
                                StringComparison.Ordinal
                            )
                        ),
                    Gateway("Gateway_0"),
                    Flow("Flow_to_gw0", "Task_2", "Gateway_0"),
                ]
            },
            {
                "another gatewayAction gateway on the sign branch",
                [
                    .. Elements()
                        .Select(e =>
                            e.Replace("targetRef=\"EndEvent_1\">", "targetRef=\"Gateway_2\">", StringComparison.Ordinal)
                        ),
                    Gateway("Gateway_2"),
                    ConditionalFlow(
                        "Flow_confirm",
                        "Gateway_2",
                        "EndEvent_1",
                        """["equals",["gatewayAction"],"confirm"]"""
                    ),
                ]
            },
        };

    [Theory]
    [MemberData(nameof(OtherShapes))]
    public async Task OtherGatewayActionShapes_GetNoPdfTask_AndAWarning(string shape, string[] elements)
    {
        WriteMetadata();
        _app.Write("config/process/process.bpmn", Process(elements));
        var processBefore = _app.Read("config/process/process.bpmn");

        var result = await Migrate();

        Assert.True(processBefore == _app.Read("config/process/process.bpmn"), shape);
        Assert.Contains(
            result.Warnings,
            warning =>
                warning.StartsWith("Gateway 'Gateway_", StringComparison.Ordinal)
                && warning.Contains("after task 'Task_2' routes on gatewayAction", StringComparison.Ordinal)
        );
        Assert.Equal(
            ["Could not insert the PDF service task(s) for [Task_2]"],
            result.Todos.Select(todo => todo[..todo.IndexOf(" automatically", StringComparison.Ordinal)])
        );
        Assert.Contains("enablePdfCreation", _app.Read("config/applicationmetadata.json"), StringComparison.Ordinal);
    }

    [Fact]
    public async Task DataTaskBeforeAGatewayActionGateway_WarningNamesTheTaskAndTheGateway()
    {
        WriteMetadata();
        _app.Write("config/process/process.bpmn", Process(Elements(taskType: "data")));

        var result = await Migrate();

        Assert.Contains(
            "Gateway 'Gateway_1' after task 'Task_2' routes on gatewayAction, which a PDF service task between them "
                + "would replace with its own action. Skipped PDF service task insertion - add a 'pdf' service task "
                + "'PdfTask_Task_2' with autoPdfTaskIds 'Task_2' on the branch of 'Gateway_1' that should produce the "
                + "PDF.",
            result.Warnings
        );
        Assert.Equal(
            [
                "Could not insert the PDF service task(s) for [Task_2] automatically, so these tasks generate no PDF in "
                    + "v9. Left applicationmetadata.json unchanged. Resolve the problems reported above (or add the "
                    + "service task(s) manually) and re-run the upgrade.",
            ],
            result.Todos
        );
    }

    [Fact]
    public async Task TaskWithCustomPdfLayout_WarningAsksForItsLayoutSet()
    {
        WriteMetadata();
        _app.Write("config/process/process.bpmn", Process(Elements(taskType: "data")));
        _app.Write(
            "ui/Task_2/Settings.json",
            """{ "pages": { "order": ["page1"], "pdfLayoutName": "pdf" }, "defaultDataType": "receipt" }"""
        );
        _app.Write("ui/Task_2/layouts/page1.json", """{ "data": { "layout": [] } }""");
        _app.Write(
            "ui/Task_2/layouts/pdf.json",
            """{ "data": { "layout": [{ "id": "pdf-instance", "type": "InstanceInformation" }] } }"""
        );

        var result = await Migrate();

        Assert.Contains(
            "Gateway 'Gateway_1' after task 'Task_2' routes on gatewayAction, which a PDF service task between them "
                + "would replace with its own action. Skipped PDF service task insertion - add a 'pdf' service task "
                + "'PdfTask_Task_2' with the layout set Altinn Studio uses for a custom PDF "
                + $"({V9MigrationDocs.Pdf}), not autoPdfTaskIds, on the branch of 'Gateway_1' that should produce the "
                + "PDF.",
            result.Warnings
        );
    }

    [Fact]
    public async Task PdfTaskAddedAsTheTodoSays_IsMigratedOnTheNextRun()
    {
        WriteMetadata();
        _app.Write("config/process/process.bpmn", Process(Elements(taskType: "data")));
        await Migrate();
        _app.Write(
            "config/process/process.bpmn",
            Process([
                .. Elements(taskType: "data")
                    .Select(e =>
                        e.Replace(
                            "targetRef=\"EndEvent_1\">",
                            "targetRef=\"PdfTask_Task_2\">",
                            StringComparison.Ordinal
                        )
                    ),
                PdfServiceTask("PdfTask_Task_2", autoPdfTaskId: "Task_2"),
                Flow("Flow_pdf", "PdfTask_Task_2", "EndEvent_1"),
            ])
        );
        var process = _app.Read("config/process/process.bpmn");

        var result = await Migrate();

        Assert.Equal(process, _app.Read("config/process/process.bpmn"));
        var pdfTask = ElementById(ProcessAfter(), "PdfTask_Task_2");
        Assert.NotNull(pdfTask);
        Assert.Equal("Task_2", pdfTask.Descendants().Single(e => e.Name.LocalName == "taskId").Value);
        Assert.Empty(result.Todos);
        Assert.DoesNotContain(
            "enablePdfCreation",
            _app.Read("config/applicationmetadata.json"),
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task SignBranch_GetsAShapeBelowTheGateway_AndEdgesForItsFlows()
    {
        WriteMetadata();
        _app.Write(
            "config/process/process.bpmn",
            WithDiagram(
                Process(Elements()),
                Shape("Task_1", 150, 80, 100, 80),
                Shape("Task_2", 300, 80, 100, 80),
                Shape("Gateway_1", 455, 95, 50, 50),
                Shape("EndEvent_1", 560, 102, 36, 36),
                Edge("Flow_1", 250, 120, 300, 120),
                Edge("Flow_to_gw", 400, 120, 455, 120),
                Edge("Flow_sign", 505, 120, 560, 120),
                Edge("Flow_reject", 480, 95, 200, 80)
            )
        );
        var before = XDocument.Parse(_app.Read("config/process/process.bpmn"));

        await Migrate();

        var plane = XDocument
            .Parse(_app.Read("config/process/process.bpmn"))
            .Descendants()
            .Single(e => e.Name.LocalName == "BPMNPlane");
        var bounds = ElementById(plane, "PdfTask_Task_2_di")?.Elements().Single();
        Assert.Equal(["430", "205", "100", "80"], Attributes(bounds, "x", "y", "width", "height"));
        Assert.Equal(["480", "145", "480", "205"], Waypoints(plane, "Flow_sign_di"));
        Assert.Equal(["530", "245", "560", "120"], Waypoints(plane, "Flow_PdfTask_Task_2_to_EndEvent_1_di"));
        var planeBefore = before.Descendants().Single(e => e.Name.LocalName == "BPMNPlane");
        Assert.Equal(Waypoints(planeBefore, "Flow_reject_di"), Waypoints(plane, "Flow_reject_di"));
        Assert.Equal(Waypoints(planeBefore, "Flow_to_gw_di"), Waypoints(plane, "Flow_to_gw_di"));
    }

    [Fact]
    public async Task GatewayWithoutAShape_StillGetsThePdfTask_AndAWarningAboutTheDiagram()
    {
        // A diagram older than the gateway: neither the gateway nor its flows are drawn.
        WriteMetadata();
        _app.Write(
            "config/process/process.bpmn",
            WithDiagram(
                Process(Elements()),
                Shape("Task_1", 150, 80, 100, 80),
                Shape("Task_2", 300, 80, 100, 80),
                Shape("EndEvent_1", 560, 102, 36, 36),
                Edge("Flow_1", 250, 120, 300, 120)
            )
        );

        var result = await Migrate();

        Assert.Equal("PdfTask_Task_2", TargetOf(ProcessAfter(), "Flow_sign"));
        Assert.DoesNotContain("PdfTask_Task_2_di", _app.Read("config/process/process.bpmn"), StringComparison.Ordinal);
        Assert.Contains(
            "Could not find a diagram shape for gateway 'Gateway_1', so the diagram in process.bpmn is out of date; "
                + "skipped adding a shape for 'PdfTask_Task_2'. The process is valid but the diagram is incomplete - "
                + "regenerate the layout in Designer.",
            result.Warnings
        );
        Assert.DoesNotContain(
            result.Warnings,
            w => w.StartsWith("The process has a BPMN diagram.", StringComparison.Ordinal)
        );
        Assert.Empty(result.Todos);
    }

    [Fact]
    public async Task SecondRun_TreatsThePdfTaskOnTheSignBranchAsMigrated()
    {
        WriteMetadata();
        _app.Write("config/process/process.bpmn", Process(Elements()));
        await Migrate();
        var process = _app.Read("config/process/process.bpmn");

        // A re-run that still finds the flag, as after a run that had to keep it for another task.
        WriteMetadata();
        var result = await Migrate();

        Assert.Equal(process, _app.Read("config/process/process.bpmn"));
        Assert.Empty(result.Todos);
        Assert.Contains(
            result.Warnings,
            w => w.Contains("treating task 'Task_2' as already migrated", StringComparison.Ordinal)
        );
    }

    private static string[] Attributes(XElement? element, params string[] names) =>
        [.. names.Select(name => element?.Attribute(name)?.Value ?? "")];

    private static string[] Waypoints(XElement plane, string edgeId) =>
        [
            .. ElementById(plane, edgeId)
                ?.Elements()
                .Where(e => e.Name.LocalName == "waypoint")
                .SelectMany(waypoint => Attributes(waypoint, "x", "y"))
                ?? [],
        ];
}
