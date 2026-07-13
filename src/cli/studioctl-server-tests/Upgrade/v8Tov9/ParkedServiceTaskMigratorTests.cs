using System.Xml.Linq;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.ParkedServiceTaskMigration;
using static Studioctl.Tests.Upgrade.v8Tov9.BpmnBuilder;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class ParkedServiceTaskMigratorTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private async Task<(MigrationResult Result, IReadOnlyList<string> Notes)> MigrateWithNotes()
    {
        var migrator = new ParkedServiceTaskMigrator(_app.Root);
        var result = await migrator.Migrate();
        return (result, migrator.GetNotes());
    }

    private async Task<MigrationResult> Migrate() => (await MigrateWithNotes()).Result;

    private XElement ProcessAfter()
    {
        var doc = XDocument.Parse(_app.Read("config/process/process.bpmn"));
        var root = doc.Root ?? throw new InvalidOperationException("process.bpmn has no root element");
        return root.Elements().Single(e => e.Name.LocalName == "process");
    }

    private static XElement? ElementById(XElement process, string id) =>
        process.Elements().FirstOrDefault(e => e.Attribute("id")?.Value == id);

    private static XElement RequireFlow(XElement process, string id)
    {
        var flow = ElementById(process, id);
        Assert.NotNull(flow);
        Assert.Equal("sequenceFlow", flow.Name.LocalName);
        return flow;
    }

    // --- Scenario A: direct wait (S → F → T) ---------------------------------------------------

    /// <summary>Task_1 → ServiceTask → Feedback → EndEvent.</summary>
    private static string DirectWaitProcess(string serviceTaskType) =>
        Process(
            StartEvent("StartEvent_1"),
            Task("Task_1", "data"),
            Task("ServiceTask_1", serviceTaskType),
            Task("Feedback_1", "feedback"),
            EndEvent("EndEvent_1"),
            Flow("Flow_start", "StartEvent_1", "Task_1"),
            Flow("Flow_data_service", "Task_1", "ServiceTask_1"),
            Flow("Flow_service_feedback", "ServiceTask_1", "Feedback_1"),
            Flow("Flow_feedback_end", "Feedback_1", "EndEvent_1")
        );

    [Theory]
    [InlineData("fiksArkiv")]
    [InlineData("eFormidling")]
    public async Task DirectWait_FeedbackIsRemovedAndFlowSpliced(string serviceTaskType)
    {
        _app.Write("config/process/process.bpmn", DirectWaitProcess(serviceTaskType));

        var (result, notes) = await MigrateWithNotes();

        Assert.False(result.ManualActionRequired);
        Assert.Empty(result.Warnings);
        Assert.Contains(notes, n => n.Contains("Removed waiting step 'Feedback_1'", StringComparison.Ordinal));

        var process = ProcessAfter();
        Assert.Null(ElementById(process, "Feedback_1"));
        Assert.Null(ElementById(process, "Flow_feedback_end"));
        var spliced = RequireFlow(process, "Flow_service_feedback");
        Assert.Equal("ServiceTask_1", spliced.Attribute("sourceRef")?.Value);
        Assert.Equal("EndEvent_1", spliced.Attribute("targetRef")?.Value);
    }

    [Fact]
    public async Task DirectWait_SecondRun_IsIdempotent()
    {
        _app.Write("config/process/process.bpmn", DirectWaitProcess("fiksArkiv"));

        await Migrate();
        var afterFirst = _app.Read("config/process/process.bpmn");

        var (result, notes) = await MigrateWithNotes();

        Assert.False(result.ManualActionRequired);
        Assert.Empty(result.Warnings);
        // The second run sees a process with no waiting step and reports only the behaviour note.
        Assert.Contains(notes, n => n.Contains("no waiting step after it", StringComparison.Ordinal));
        Assert.Equal(afterFirst, _app.Read("config/process/process.bpmn"));
    }

    [Fact]
    public async Task DirectWait_RemovedTaskWithUiFolder_WarnsAboutOrphanedFolder()
    {
        _app.Write("config/process/process.bpmn", DirectWaitProcess("fiksArkiv"));
        _app.Write("ui/Feedback_1/Settings.json", "{}");

        var result = await Migrate();

        Assert.False(result.ManualActionRequired);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("Feedback_1", warning, StringComparison.Ordinal);
        Assert.Contains("UI folder", warning, StringComparison.Ordinal);
    }

    // --- Scenario B: gateway wait (S → G1 → F → T), the shape real FiksArkiv apps use ------------

    /// <summary>
    /// The double-gateway shape from production FiksArkiv apps: the service task exits through a
    /// gateway (reject → error task, otherwise → feedback), and the feedback exits through a second
    /// gateway with the same reject condition to the same error task (otherwise → end).
    /// </summary>
    private static string GatewayWaitProcess(
        string entryRejectTarget = "Error_1",
        string successorRejectTarget = "Error_1"
    ) =>
        Process(
            StartEvent("StartEvent_1"),
            Task("Task_1", "data"),
            Task("ServiceTask_1", "fiksArkiv"),
            Gateway("Gateway_entry"),
            Task("Feedback_1", "feedback"),
            Gateway("Gateway_result"),
            Task("Error_1", "data"),
            Task("Error_2", "data"),
            EndEvent("EndEvent_1"),
            Flow("Flow_start", "StartEvent_1", "Task_1"),
            Flow("Flow_data_service", "Task_1", "ServiceTask_1"),
            Flow("Flow_service_entry", "ServiceTask_1", "Gateway_entry"),
            ConditionalFlow(
                "Flow_entry_feedback",
                "Gateway_entry",
                "Feedback_1",
                """["notEquals",["gatewayAction"],"reject"]"""
            ),
            ConditionalFlow(
                "Flow_entry_reject",
                "Gateway_entry",
                entryRejectTarget,
                """["equals",["gatewayAction"],"reject"]"""
            ),
            Flow("Flow_feedback_result", "Feedback_1", "Gateway_result"),
            ConditionalFlow(
                "Flow_result_reject",
                "Gateway_result",
                successorRejectTarget,
                """["equals", ["gatewayAction"], "reject"]"""
            ),
            ConditionalFlow(
                "Flow_result_end",
                "Gateway_result",
                "EndEvent_1",
                """["notEquals",["gatewayAction"],"reject"]"""
            ),
            Flow("Flow_error1_back", "Error_1", "Task_1"),
            Flow("Flow_error2_back", "Error_2", "Task_1")
        );

    [Fact]
    public async Task GatewayWait_MatchingEscapeBranches_FeedbackIsBypassed()
    {
        _app.Write("config/process/process.bpmn", GatewayWaitProcess());

        var (result, notes) = await MigrateWithNotes();

        Assert.False(result.ManualActionRequired);
        Assert.Empty(result.Warnings);
        Assert.Contains(notes, n => n.Contains("Removed waiting step 'Feedback_1'", StringComparison.Ordinal));

        var process = ProcessAfter();
        Assert.Null(ElementById(process, "Feedback_1"));
        Assert.Null(ElementById(process, "Flow_feedback_result"));
        // The gateway's waiting branch now targets the result gateway, keeping its condition.
        var bypass = RequireFlow(process, "Flow_entry_feedback");
        Assert.Equal("Gateway_entry", bypass.Attribute("sourceRef")?.Value);
        Assert.Equal("Gateway_result", bypass.Attribute("targetRef")?.Value);
        Assert.Contains(bypass.Elements(), e => e.Name.LocalName == "conditionExpression");
        // The escape branches are untouched.
        Assert.Equal("Error_1", RequireFlow(process, "Flow_entry_reject").Attribute("targetRef")?.Value);
        Assert.Equal("Error_1", RequireFlow(process, "Flow_result_reject").Attribute("targetRef")?.Value);
        Assert.Equal("EndEvent_1", RequireFlow(process, "Flow_result_end").Attribute("targetRef")?.Value);
    }

    [Fact]
    public async Task GatewayWait_EscapeBranchesDisagree_IsLeftUnchangedWithWarning()
    {
        // The entry gateway rejects to Error_1 but the result gateway rejects to Error_2: removing
        // the waiting step would silently reroute error replies from Error_2 to Error_1.
        var original = GatewayWaitProcess(entryRejectTarget: "Error_1", successorRejectTarget: "Error_2");
        _app.Write("config/process/process.bpmn", original);

        var result = await Migrate();

        Assert.True(result.ManualActionRequired);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("Feedback_1", warning, StringComparison.Ordinal);
        Assert.Contains("would change routing", warning, StringComparison.Ordinal);
        Assert.Equal(original, _app.Read("config/process/process.bpmn"));
    }

    [Fact]
    public async Task GatewayWait_GatewayFedByNonServiceTask_IsLeftUnchangedWithWarning()
    {
        _app.Write(
            "config/process/process.bpmn",
            Process(
                StartEvent("StartEvent_1"),
                Task("Task_1", "data"),
                Task("ServiceTask_1", "fiksArkiv"),
                Gateway("Gateway_entry"),
                Task("Feedback_1", "feedback"),
                EndEvent("EndEvent_1"),
                Flow("Flow_start", "StartEvent_1", "Task_1"),
                Flow("Flow_data_service", "Task_1", "ServiceTask_1"),
                Flow("Flow_service_entry", "ServiceTask_1", "Gateway_entry"),
                // The data task also routes into the same gateway.
                Flow("Flow_data_entry", "Task_1", "Gateway_entry"),
                Flow("Flow_entry_feedback", "Gateway_entry", "Feedback_1"),
                Flow("Flow_feedback_end", "Feedback_1", "EndEvent_1")
            )
        );

        var result = await Migrate();

        Assert.True(result.ManualActionRequired);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("also fed by [Task_1]", warning, StringComparison.Ordinal);
        Assert.NotNull(ElementById(ProcessAfter(), "Feedback_1"));
    }

    // --- Defensive scenarios --------------------------------------------------------------------

    [Fact]
    public async Task FeedbackWithMultipleOutgoingFlows_IsLeftUnchangedWithWarning()
    {
        _app.Write(
            "config/process/process.bpmn",
            Process(
                StartEvent("StartEvent_1"),
                Task("ServiceTask_1", "fiksArkiv"),
                Task("Feedback_1", "feedback"),
                EndEvent("EndEvent_1"),
                EndEvent("EndEvent_2"),
                Flow("Flow_start", "StartEvent_1", "ServiceTask_1"),
                Flow("Flow_service_feedback", "ServiceTask_1", "Feedback_1"),
                ConditionalFlow(
                    "Flow_feedback_end1",
                    "Feedback_1",
                    "EndEvent_1",
                    """["equals",["gatewayAction"],"x"]"""
                ),
                ConditionalFlow(
                    "Flow_feedback_end2",
                    "Feedback_1",
                    "EndEvent_2",
                    """["notEquals",["gatewayAction"],"x"]"""
                )
            )
        );

        var result = await Migrate();

        Assert.True(result.ManualActionRequired);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("exactly one unconditional outgoing", warning, StringComparison.Ordinal);
        Assert.NotNull(ElementById(ProcessAfter(), "Feedback_1"));
    }

    [Fact]
    public async Task FeedbackFedFromOtherSources_IsLeftUnchangedWithWarning()
    {
        _app.Write(
            "config/process/process.bpmn",
            Process(
                StartEvent("StartEvent_1"),
                Task("Task_1", "data"),
                Task("ServiceTask_1", "fiksArkiv"),
                Task("Feedback_1", "feedback"),
                EndEvent("EndEvent_1"),
                Flow("Flow_start", "StartEvent_1", "Task_1"),
                Flow("Flow_data_service", "Task_1", "ServiceTask_1"),
                Flow("Flow_service_feedback", "ServiceTask_1", "Feedback_1"),
                // The feedback step is also entered directly from the data task.
                Flow("Flow_data_feedback", "Task_1", "Feedback_1"),
                Flow("Flow_feedback_end", "Feedback_1", "EndEvent_1")
            )
        );

        var result = await Migrate();

        Assert.True(result.ManualActionRequired);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("also entered from [Task_1]", warning, StringComparison.Ordinal);
        Assert.NotNull(ElementById(ProcessAfter(), "Feedback_1"));
    }

    [Fact]
    public async Task NestedGateways_AreLeftUnchangedWithWarning()
    {
        _app.Write(
            "config/process/process.bpmn",
            Process(
                StartEvent("StartEvent_1"),
                Task("ServiceTask_1", "fiksArkiv"),
                Gateway("Gateway_1"),
                Gateway("Gateway_2"),
                Task("Feedback_1", "feedback"),
                EndEvent("EndEvent_1"),
                Flow("Flow_start", "StartEvent_1", "ServiceTask_1"),
                Flow("Flow_service_g1", "ServiceTask_1", "Gateway_1"),
                Flow("Flow_g1_g2", "Gateway_1", "Gateway_2"),
                Flow("Flow_g2_feedback", "Gateway_2", "Feedback_1"),
                Flow("Flow_feedback_end", "Feedback_1", "EndEvent_1")
            )
        );

        var result = await Migrate();

        Assert.True(result.ManualActionRequired);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("more than one gateway", warning, StringComparison.Ordinal);
        Assert.NotNull(ElementById(ProcessAfter(), "Feedback_1"));
    }

    [Fact]
    public async Task ServiceTaskWithoutWaitingStep_ReportsBehaviourNoteOnly()
    {
        _app.Write(
            "config/process/process.bpmn",
            Process(
                StartEvent("StartEvent_1"),
                Task("ServiceTask_1", "eFormidling"),
                EndEvent("EndEvent_1"),
                Flow("Flow_start", "StartEvent_1", "ServiceTask_1"),
                Flow("Flow_service_end", "ServiceTask_1", "EndEvent_1")
            )
        );
        var original = _app.Read("config/process/process.bpmn");

        var (result, notes) = await MigrateWithNotes();

        Assert.False(result.ManualActionRequired);
        Assert.Empty(result.Warnings);
        var note = Assert.Single(notes);
        Assert.Contains("no waiting step after it", note, StringComparison.Ordinal);
        Assert.Equal(original, _app.Read("config/process/process.bpmn"));
    }

    [Fact]
    public async Task FeedbackUnrelatedToParkedServiceTasks_IsLeftAloneSilently()
    {
        // A feedback step fed by a data task is a legitimate user-facing waiting step - not ours.
        _app.Write(
            "config/process/process.bpmn",
            Process(
                StartEvent("StartEvent_1"),
                Task("Task_1", "data"),
                Task("Feedback_1", "feedback"),
                Task("ServiceTask_1", "fiksArkiv"),
                EndEvent("EndEvent_1"),
                Flow("Flow_start", "StartEvent_1", "Task_1"),
                Flow("Flow_data_feedback", "Task_1", "Feedback_1"),
                Flow("Flow_feedback_service", "Feedback_1", "ServiceTask_1"),
                Flow("Flow_service_end", "ServiceTask_1", "EndEvent_1")
            )
        );
        var original = _app.Read("config/process/process.bpmn");

        var (result, notes) = await MigrateWithNotes();

        Assert.False(result.ManualActionRequired);
        Assert.Empty(result.Warnings);
        // The service task itself has no waiting step, which is reported as a note.
        Assert.Single(notes);
        Assert.NotNull(ElementById(ProcessAfter(), "Feedback_1"));
        Assert.Equal(original, _app.Read("config/process/process.bpmn"));
    }

    [Fact]
    public async Task NoParkedServiceTasks_IsANoOp()
    {
        _app.Write(
            "config/process/process.bpmn",
            Process(
                StartEvent("StartEvent_1"),
                Task("Task_1", "data"),
                Task("Feedback_1", "feedback"),
                EndEvent("EndEvent_1"),
                Flow("Flow_start", "StartEvent_1", "Task_1"),
                Flow("Flow_data_feedback", "Task_1", "Feedback_1"),
                Flow("Flow_feedback_end", "Feedback_1", "EndEvent_1")
            )
        );
        var original = _app.Read("config/process/process.bpmn");

        var (result, notes) = await MigrateWithNotes();

        Assert.False(result.ManualActionRequired);
        Assert.Empty(result.Warnings);
        Assert.Empty(notes);
        Assert.Equal(original, _app.Read("config/process/process.bpmn"));
    }

    [Fact]
    public async Task MissingProcessFile_IsANoOp()
    {
        var result = await Migrate();

        Assert.False(result.ManualActionRequired);
        Assert.Empty(result.Warnings);
    }

    [Fact]
    public async Task InvalidXml_WarnsAndRequiresManualAction()
    {
        _app.Write("config/process/process.bpmn", "<bpmn:definitions");

        var result = await Migrate();

        Assert.True(result.ManualActionRequired);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("not valid XML", warning, StringComparison.Ordinal);
    }

    // --- Real-world shape: the production FiksArkiv app (trimmed), including the diagram ---------

    /// <summary>
    /// A trimmed copy of a production FiksArkiv app's process: data task → decision gateway →
    /// (sftp branch | fiksArkiv → entry gateway → feedback → result gateway) with a shared error
    /// task and a diagram. The feedback ("Ventesteg") must be bypassed; everything else stays.
    /// </summary>
    private const string ProductionShapedProcess = """
        <?xml version="1.0" encoding="UTF-8"?>
        <bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xmlns:altinn="http://altinn.no/process" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
          xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
          xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
          xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1"
          targetNamespace="http://bpmn.io/schema/bpmn">
          <bpmn:process id="Process_1" isExecutable="false">
            <bpmn:startEvent id="StartEvent_1">
              <bpmn:outgoing>Flow_Start_Task1</bpmn:outgoing>
            </bpmn:startEvent>
            <bpmn:sequenceFlow id="Flow_Start_Task1" sourceRef="StartEvent_1" targetRef="Task_1" />
            <bpmn:task id="Task_1" name="Utfylling">
              <bpmn:extensionElements>
                <altinn:taskExtension>
                  <altinn:taskType>data</altinn:taskType>
                </altinn:taskExtension>
              </bpmn:extensionElements>
              <bpmn:incoming>Flow_Start_Task1</bpmn:incoming>
              <bpmn:incoming>SequenceFlow_FeilmeldingTilUtfylling</bpmn:incoming>
              <bpmn:outgoing>Flow_Task1_Shipment</bpmn:outgoing>
            </bpmn:task>
            <bpmn:sequenceFlow id="Flow_Task1_Shipment" sourceRef="Task_1" targetRef="Shipment_Decision_Gateway" />
            <bpmn:exclusiveGateway id="Shipment_Decision_Gateway" name="Sende med Fiks Arkiv eller FTP?">
              <bpmn:incoming>Flow_Task1_Shipment</bpmn:incoming>
              <bpmn:outgoing>Flow_Shipment_Ftp</bpmn:outgoing>
              <bpmn:outgoing>Flow_Shipment_Fiks</bpmn:outgoing>
            </bpmn:exclusiveGateway>
            <bpmn:sequenceFlow id="Flow_Shipment_Ftp" sourceRef="Shipment_Decision_Gateway" targetRef="ServiceTask_SFTP">
              <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">
                ["equals", ["dataModel", "SendByFiks", "HelperDataModel"], "false"]
              </bpmn:conditionExpression>
            </bpmn:sequenceFlow>
            <bpmn:task id="ServiceTask_SFTP" name="FTP Service task">
              <bpmn:extensionElements>
                <altinn:taskExtension>
                  <altinn:taskType>sftp</altinn:taskType>
                </altinn:taskExtension>
              </bpmn:extensionElements>
              <bpmn:incoming>Flow_Shipment_Ftp</bpmn:incoming>
              <bpmn:outgoing>SequenceFlow_SFTPTilGateway</bpmn:outgoing>
            </bpmn:task>
            <bpmn:sequenceFlow id="SequenceFlow_SFTPTilGateway" sourceRef="ServiceTask_SFTP" targetRef="Gateway_MottakSvar" />
            <bpmn:endEvent id="EndEvent_1">
              <bpmn:incoming>SequenceFlow_MottattSvarGatewayTilEndEvent</bpmn:incoming>
            </bpmn:endEvent>
            <bpmn:sequenceFlow id="Flow_Shipment_Fiks" name="Fiks Arkiv" sourceRef="Shipment_Decision_Gateway" targetRef="ServiceTask_FiksArkiv">
              <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">
                ["equals", ["dataModel", "SendByFiks", "HelperDataModel"], "true"]
              </bpmn:conditionExpression>
            </bpmn:sequenceFlow>
            <bpmn:task id="Fiks_Feedback" name="Ventesteg">
              <bpmn:extensionElements>
                <altinn:taskExtension>
                  <altinn:taskType>feedback</altinn:taskType>
                </altinn:taskExtension>
              </bpmn:extensionElements>
              <bpmn:incoming>SequenceFlow_FiksArkivServiceTaskTilVentesteg</bpmn:incoming>
              <bpmn:outgoing>SequenceFlow_VentestegTilGateway</bpmn:outgoing>
            </bpmn:task>
            <bpmn:exclusiveGateway id="Gateway_MottakSvar" name="Resultat?">
              <bpmn:incoming>SequenceFlow_SFTPTilGateway</bpmn:incoming>
              <bpmn:incoming>SequenceFlow_VentestegTilGateway</bpmn:incoming>
              <bpmn:outgoing>SequenceFlow_MottattSvarGatewayTilFeilmelding</bpmn:outgoing>
              <bpmn:outgoing>SequenceFlow_MottattSvarGatewayTilEndEvent</bpmn:outgoing>
            </bpmn:exclusiveGateway>
            <bpmn:sequenceFlow id="SequenceFlow_VentestegTilGateway" sourceRef="Fiks_Feedback" targetRef="Gateway_MottakSvar" />
            <bpmn:task id="Fiks_Error" name="Feilmelding">
              <bpmn:extensionElements>
                <altinn:taskExtension>
                  <altinn:taskType>data</altinn:taskType>
                </altinn:taskExtension>
              </bpmn:extensionElements>
              <bpmn:incoming>SequenceFlow_MottattSvarGatewayTilFeilmelding</bpmn:incoming>
              <bpmn:incoming>SequenceFlow_InnsendingsfeilTilFeilmelding</bpmn:incoming>
              <bpmn:outgoing>SequenceFlow_FeilmeldingTilUtfylling</bpmn:outgoing>
            </bpmn:task>
            <bpmn:sequenceFlow id="SequenceFlow_MottattSvarGatewayTilFeilmelding" sourceRef="Gateway_MottakSvar" targetRef="Fiks_Error">
              <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">
                ["equals",["gatewayAction"],"reject"]</bpmn:conditionExpression>
            </bpmn:sequenceFlow>
            <bpmn:sequenceFlow id="SequenceFlow_MottattSvarGatewayTilEndEvent" name="Suksess" sourceRef="Gateway_MottakSvar" targetRef="EndEvent_1">
              <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">
                ["notEquals",["gatewayAction"],"reject"]</bpmn:conditionExpression>
            </bpmn:sequenceFlow>
            <bpmn:sequenceFlow id="SequenceFlow_FeilmeldingTilUtfylling" sourceRef="Fiks_Error" targetRef="Task_1" />
            <bpmn:task id="ServiceTask_FiksArkiv" name="Fiks Arkiv innsending">
              <bpmn:extensionElements>
                <altinn:taskExtension>
                  <altinn:taskType>fiksArkiv</altinn:taskType>
                </altinn:taskExtension>
              </bpmn:extensionElements>
              <bpmn:incoming>Flow_Shipment_Fiks</bpmn:incoming>
              <bpmn:outgoing>SequenceFlow_FiksArkivTilGateway</bpmn:outgoing>
            </bpmn:task>
            <bpmn:exclusiveGateway id="Gateway_FiksArkivServiceTask">
              <bpmn:incoming>SequenceFlow_FiksArkivTilGateway</bpmn:incoming>
              <bpmn:outgoing>SequenceFlow_FiksArkivServiceTaskTilVentesteg</bpmn:outgoing>
              <bpmn:outgoing>SequenceFlow_InnsendingsfeilTilFeilmelding</bpmn:outgoing>
            </bpmn:exclusiveGateway>
            <bpmn:sequenceFlow id="SequenceFlow_FiksArkivTilGateway" sourceRef="ServiceTask_FiksArkiv" targetRef="Gateway_FiksArkivServiceTask" />
            <bpmn:sequenceFlow id="SequenceFlow_FiksArkivServiceTaskTilVentesteg" sourceRef="Gateway_FiksArkivServiceTask" targetRef="Fiks_Feedback">
              <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">
                ["notEquals",["gatewayAction"],"reject"]</bpmn:conditionExpression>
            </bpmn:sequenceFlow>
            <bpmn:sequenceFlow id="SequenceFlow_InnsendingsfeilTilFeilmelding" name="Innsending feilet" sourceRef="Gateway_FiksArkivServiceTask" targetRef="Fiks_Error">
              <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">
                ["equals",["gatewayAction"],"reject"]</bpmn:conditionExpression>
            </bpmn:sequenceFlow>
          </bpmn:process>
          <bpmndi:BPMNDiagram id="BPMNDiagram_1">
            <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
              <bpmndi:BPMNShape id="Fiks_Feedback_di" bpmnElement="Fiks_Feedback">
                <dc:Bounds x="790" y="230" width="100" height="80" />
              </bpmndi:BPMNShape>
              <bpmndi:BPMNShape id="Gateway_FiksArkivServiceTask_di" bpmnElement="Gateway_FiksArkivServiceTask" isMarkerVisible="true">
                <dc:Bounds x="715" y="245" width="50" height="50" />
              </bpmndi:BPMNShape>
              <bpmndi:BPMNShape id="Gateway_MottakSvar_di" bpmnElement="Gateway_MottakSvar" isMarkerVisible="true">
                <dc:Bounds x="965" y="245" width="50" height="50" />
              </bpmndi:BPMNShape>
              <bpmndi:BPMNEdge id="SequenceFlow_VentestegTilGateway_di" bpmnElement="SequenceFlow_VentestegTilGateway">
                <di:waypoint x="890" y="270" />
                <di:waypoint x="965" y="270" />
              </bpmndi:BPMNEdge>
              <bpmndi:BPMNEdge id="SequenceFlow_FiksArkivServiceTaskTilVentesteg_di" bpmnElement="SequenceFlow_FiksArkivServiceTaskTilVentesteg">
                <di:waypoint x="765" y="270" />
                <di:waypoint x="790" y="270" />
              </bpmndi:BPMNEdge>
            </bpmndi:BPMNPlane>
          </bpmndi:BPMNDiagram>
        </bpmn:definitions>
        """;

    [Fact]
    public async Task ProductionShape_VentestegIsBypassedAndDiagramMaintained()
    {
        _app.Write("config/process/process.bpmn", ProductionShapedProcess);

        var (result, notes) = await MigrateWithNotes();

        Assert.False(result.ManualActionRequired);
        // Only the diagram best-effort warning is expected.
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("BPMN diagram", warning, StringComparison.Ordinal);
        Assert.Contains(notes, n => n.Contains("Removed waiting step 'Fiks_Feedback'", StringComparison.Ordinal));

        var process = ProcessAfter();
        Assert.Null(ElementById(process, "Fiks_Feedback"));
        Assert.Null(ElementById(process, "SequenceFlow_VentestegTilGateway"));

        // The waiting branch now routes straight to the result gateway, keeping its condition.
        var bypass = RequireFlow(process, "SequenceFlow_FiksArkivServiceTaskTilVentesteg");
        Assert.Equal("Gateway_FiksArkivServiceTask", bypass.Attribute("sourceRef")?.Value);
        Assert.Equal("Gateway_MottakSvar", bypass.Attribute("targetRef")?.Value);
        Assert.Contains(bypass.Elements(), e => e.Name.LocalName == "conditionExpression");

        // The result gateway's <incoming> hint is repointed to the retargeted flow.
        var resultGateway = ElementById(process, "Gateway_MottakSvar");
        Assert.NotNull(resultGateway);
        Assert.Contains(
            resultGateway.Elements(),
            e => e.Name.LocalName == "incoming" && e.Value == "SequenceFlow_FiksArkivServiceTaskTilVentesteg"
        );

        // Untouched paths: the SFTP branch and both error routes.
        Assert.Equal(
            "Gateway_MottakSvar",
            RequireFlow(process, "SequenceFlow_SFTPTilGateway").Attribute("targetRef")?.Value
        );
        Assert.Equal(
            "Fiks_Error",
            RequireFlow(process, "SequenceFlow_InnsendingsfeilTilFeilmelding").Attribute("targetRef")?.Value
        );
        Assert.Equal(
            "Fiks_Error",
            RequireFlow(process, "SequenceFlow_MottattSvarGatewayTilFeilmelding").Attribute("targetRef")?.Value
        );

        // Diagram: the waiting step's shape and edge are gone; the retargeted edge now ends at the
        // result gateway (x=965).
        var doc = XDocument.Parse(_app.Read("config/process/process.bpmn"));
        Assert.DoesNotContain(doc.Descendants(), e => e.Attribute("bpmnElement")?.Value == "Fiks_Feedback");
        Assert.DoesNotContain(
            doc.Descendants(),
            e => e.Attribute("bpmnElement")?.Value == "SequenceFlow_VentestegTilGateway"
        );
        var edge = doc.Descendants()
            .Single(e => e.Attribute("bpmnElement")?.Value == "SequenceFlow_FiksArkivServiceTaskTilVentesteg");
        var lastWaypoint = edge.Elements().Last(e => e.Name.LocalName == "waypoint");
        Assert.Equal("965", lastWaypoint.Attribute("x")?.Value);
    }

    [Fact]
    public async Task ProductionShape_SecondRun_IsIdempotent()
    {
        _app.Write("config/process/process.bpmn", ProductionShapedProcess);

        await Migrate();
        var afterFirst = _app.Read("config/process/process.bpmn");

        var result = await Migrate();

        Assert.False(result.ManualActionRequired);
        Assert.Empty(result.Warnings);
        Assert.Equal(afterFirst, _app.Read("config/process/process.bpmn"));
    }
}
