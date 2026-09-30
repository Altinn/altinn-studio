using System.Text.Json;
using System.Text.Json.Nodes;
using System.Xml.Linq;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.PdfServiceTaskMigration;
using static Studioctl.Tests.Upgrade.v8Tov9.BpmnBuilder;
using LayoutSetsToTaskUiMigrator = Altinn.Studio.Cli.Upgrade.v8Tov9.LayoutSetsMigration.LayoutSetsToTaskUiMigrator;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class PdfServiceTaskMigratorTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private async Task<MigrationResult> MigrateResult() => await new PdfServiceTaskMigrator(_app.Root).Migrate();

    private async Task<IReadOnlyList<string>> Migrate() => (await MigrateResult()).Warnings;

    private async Task<IReadOnlyList<string>> MigrateTodos() => (await MigrateResult()).Todos;

    private XElement ProcessAfter()
    {
        var doc = XDocument.Parse(_app.Read("config/process/process.bpmn"));
        var root = doc.Root ?? throw new InvalidOperationException("process.bpmn has no root element");
        return root.Elements().Single(e => e.Name.LocalName == "process");
    }

    private static XElement? ElementById(XElement process, string id) =>
        process.Elements().FirstOrDefault(e => e.Attribute("id")?.Value == id);

    [Fact]
    public async Task PdfEnabledFormData_GetsPdfServiceTaskAndFlagStripped()
    {
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(FormDataType("model", "Task_1", enablePdfCreation: true), AttachmentDataType("file", false))
        );
        _app.Write(
            "config/process/process.bpmn",
            Process(
                StartEvent("StartEvent_1"),
                Task("Task_1", "data"),
                EndEvent("EndEvent_1"),
                Flow("Flow_start", "StartEvent_1", "Task_1"),
                Flow("Flow_end", "Task_1", "EndEvent_1")
            )
        );

        await Migrate();

        var process = ProcessAfter();

        // T --flow--> PdfTask_T --newFlow--> X
        var pdfTask = ElementById(process, "PdfTask_Task_1");
        Assert.NotNull(pdfTask);
        Assert.Equal("serviceTask", pdfTask.Name.LocalName);
        Assert.Equal("pdf", pdfTask.Descendants().Single(e => e.Name.LocalName == "taskType").Value);
        Assert.Equal("Task_1", pdfTask.Descendants().Single(e => e.Name.LocalName == "taskId").Value);

        Assert.Equal("PdfTask_Task_1", ElementById(process, "Flow_end")?.Attribute("targetRef")?.Value);
        var newFlow = ElementById(process, "Flow_PdfTask_Task_1_to_EndEvent_1");
        Assert.Equal("EndEvent_1", newFlow?.Attribute("targetRef")?.Value);

        Assert.DoesNotContain(
            "enablePdfCreation",
            _app.Read("config/applicationmetadata.json"),
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task AttachmentAndTaskLessDataTypes_WereLegacyNoOps_GetNoPdfTask()
    {
        // enablePdfCreation on an attachment (no classRef) or without a taskId never produced a PDF
        // in v8, so no service task is added - but the deprecated flag is still stripped.
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(
                AttachmentDataType("file", enablePdfCreation: true),
                """
                    {
                      "id": "stateless-model",
                      "enablePdfCreation": true,
                      "appLogic": {
                        "classRef": "Altinn.App.Models.Stateless"
                      }
                    }
                """
            )
        );
        _app.Write(
            "config/process/process.bpmn",
            Process(Task("Task_1", "data"), Flow("Flow_end", "Task_1", "EndEvent_1"), EndEvent("EndEvent_1"))
        );
        var processBefore = _app.Read("config/process/process.bpmn");

        var warnings = await Migrate();

        Assert.Equal(processBefore, _app.Read("config/process/process.bpmn"));
        Assert.DoesNotContain(
            "enablePdfCreation",
            _app.Read("config/applicationmetadata.json"),
            StringComparison.Ordinal
        );
        Assert.Contains(warnings, w => w.Contains("no taskId", StringComparison.Ordinal));
    }

    [Fact]
    public async Task TaskNotFoundInProcess_FlagIsKeptAndWarned()
    {
        // Stripping the flag when the service task could not be inserted would leave the app with
        // neither the v8 flag nor the v9 task, silently dropping PDF generation.
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(FormDataType("model", "Task_Ghost", enablePdfCreation: true))
        );
        _app.Write(
            "config/process/process.bpmn",
            Process(Task("Task_1", "data"), Flow("Flow_end", "Task_1", "EndEvent_1"), EndEvent("EndEvent_1"))
        );

        var result = await MigrateResult();

        Assert.Contains("enablePdfCreation", _app.Read("config/applicationmetadata.json"), StringComparison.Ordinal);
        Assert.Contains(result.Warnings, w => w.Contains("Task_Ghost", StringComparison.Ordinal));
        Assert.Contains(result.Todos, t => t.Contains("Left enablePdfCreation", StringComparison.Ordinal));
    }

    [Fact]
    public async Task AmbiguousOutgoingFlows_FlagIsKeptAndWarned()
    {
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(FormDataType("model", "Task_1", enablePdfCreation: true))
        );
        _app.Write(
            "config/process/process.bpmn",
            Process(
                Task("Task_1", "data"),
                Flow("Flow_a", "Task_1", "EndEvent_1"),
                Flow("Flow_b", "Task_1", "EndEvent_2"),
                EndEvent("EndEvent_1"),
                EndEvent("EndEvent_2")
            )
        );

        var warnings = await Migrate();

        Assert.Contains("enablePdfCreation", _app.Read("config/applicationmetadata.json"), StringComparison.Ordinal);
        Assert.Contains(warnings, w => w.Contains("2 outgoing sequence flows", StringComparison.Ordinal));
    }

    [Fact]
    public async Task AlreadyMigratedTask_CountsAsSatisfied_FlagIsStripped()
    {
        // A PdfTask left by a previous (partial) run counts as migrated, so a re-run can finish the
        // job and strip the flag.
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(FormDataType("model", "Task_1", enablePdfCreation: true))
        );
        _app.Write(
            "config/process/process.bpmn",
            Process(
                Task("Task_1", "data"),
                PdfServiceTask("PdfTask_Task_1"),
                Flow("Flow_end", "Task_1", "PdfTask_Task_1"),
                Flow("Flow_pdf", "PdfTask_Task_1", "EndEvent_1"),
                EndEvent("EndEvent_1")
            )
        );

        var warnings = await Migrate();

        Assert.Contains(warnings, w => w.Contains("already migrated", StringComparison.Ordinal));
        Assert.DoesNotContain(
            "enablePdfCreation",
            _app.Read("config/applicationmetadata.json"),
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task DownstreamGatewayWithConditions_GetsConnectedDataTypeIdPinned()
    {
        // Gateways used to infer their data model from the current task; with the pdf task inserted
        // in front, the data task's form model must be pinned explicitly.
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(FormDataType("model", "Task_1", enablePdfCreation: true))
        );
        _app.Write(
            "config/process/process.bpmn",
            Process(
                Task("Task_1", "data"),
                Gateway("Gateway_1"),
                Flow("Flow_to_gw", "Task_1", "Gateway_1"),
                ConditionalFlow(
                    "Flow_yes",
                    "Gateway_1",
                    "EndEvent_1",
                    "[\"equals\", [\"dataModel\", \"model.done\"], true]"
                ),
                ConditionalFlow(
                    "Flow_no",
                    "Gateway_1",
                    "EndEvent_2",
                    "[\"equals\", [\"dataModel\", \"model.done\"], false]"
                ),
                EndEvent("EndEvent_1"),
                EndEvent("EndEvent_2")
            )
        );

        var warnings = await Migrate();

        var gateway = ElementById(ProcessAfter(), "Gateway_1");
        Assert.Equal("model", gateway?.Descendants().Single(e => e.Name.LocalName == "connectedDataTypeId").Value);
        Assert.Contains(warnings, w => w.Contains("connectedDataTypeId", StringComparison.Ordinal));
    }

    [Fact]
    public async Task GatewayWithExplicitDataType_IsLeftUntouched()
    {
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(FormDataType("model", "Task_1", enablePdfCreation: true))
        );
        _app.Write(
            "config/process/process.bpmn",
            Process(
                Task("Task_1", "data"),
                """
                    <bpmn:exclusiveGateway id="Gateway_1">
                      <bpmn:extensionElements>
                        <altinn:gatewayExtension>
                          <altinn:connectedDataTypeId>other-model</altinn:connectedDataTypeId>
                        </altinn:gatewayExtension>
                      </bpmn:extensionElements>
                    </bpmn:exclusiveGateway>
                """,
                Flow("Flow_to_gw", "Task_1", "Gateway_1"),
                ConditionalFlow("Flow_yes", "Gateway_1", "EndEvent_1", "[\"equals\", true, true]"),
                ConditionalFlow("Flow_no", "Gateway_1", "EndEvent_2", "[\"equals\", true, false]"),
                EndEvent("EndEvent_1"),
                EndEvent("EndEvent_2")
            )
        );

        await Migrate();

        var gateway = ElementById(ProcessAfter(), "Gateway_1");
        Assert.NotNull(gateway);
        var dataTypeIds = gateway.Descendants().Where(e => e.Name.LocalName == "connectedDataTypeId").ToList();
        Assert.Single(dataTypeIds);
        Assert.Equal("other-model", dataTypeIds[0].Value);
    }

    [Fact]
    public async Task ProcessFileBom_IsPreserved_AndAbsenceStaysAbsent()
    {
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(FormDataType("model", "Task_1", enablePdfCreation: true))
        );
        var bpmn = Process(Task("Task_1", "data"), Flow("Flow_end", "Task_1", "EndEvent_1"), EndEvent("EndEvent_1"));
        _app.WriteBytes("config/process/process.bpmn", [0xEF, 0xBB, 0xBF, .. System.Text.Encoding.UTF8.GetBytes(bpmn)]);

        await Migrate();
        Assert.True(
            _app.ReadBytes("config/process/process.bpmn") is [0xEF, 0xBB, 0xBF, ..],
            "expected the UTF-8 BOM to be preserved"
        );

        // And the inverse: a BOM-less file must not gain one.
        using var second = new TempAppFolder();
        second.Write(
            "config/applicationmetadata.json",
            Metadata(FormDataType("model", "Task_1", enablePdfCreation: true))
        );
        second.Write("config/process/process.bpmn", bpmn);

        await new PdfServiceTaskMigrator(second.Root).Migrate();
        Assert.False(
            second.ReadBytes("config/process/process.bpmn") is [0xEF, 0xBB, 0xBF, ..],
            "expected no UTF-8 BOM to be introduced"
        );
    }

    [Fact]
    public async Task SecondRun_IsIdempotent()
    {
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(FormDataType("model", "Task_1", enablePdfCreation: true))
        );
        _app.Write(
            "config/process/process.bpmn",
            Process(Task("Task_1", "data"), Flow("Flow_end", "Task_1", "EndEvent_1"), EndEvent("EndEvent_1"))
        );

        await Migrate();
        var processAfterFirst = _app.Read("config/process/process.bpmn");
        var metadataAfterFirst = _app.Read("config/applicationmetadata.json");

        await Migrate();

        Assert.Equal(processAfterFirst, _app.Read("config/process/process.bpmn"));
        Assert.Equal(metadataAfterFirst, _app.Read("config/applicationmetadata.json"));
    }

    [Fact]
    public async Task NonUtf8ProcessFile_IsRefused_NothingTouched()
    {
        // A legacy-encoded file must not be decoded lossily and rewritten: that would permanently
        // replace the non-ASCII content with U+FFFD.
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(FormDataType("model", "Task_1", enablePdfCreation: true))
        );
        var bpmn = Process(
            Task("Task_1", "data"),
            "    <!-- norsk: blæh -->",
            Flow("Flow_end", "Task_1", "EndEvent_1"),
            EndEvent("EndEvent_1")
        );
        _app.WriteBytes("config/process/process.bpmn", System.Text.Encoding.Latin1.GetBytes(bpmn));
        var processBytesBefore = _app.ReadBytes("config/process/process.bpmn");

        var todos = await MigrateTodos();

        Assert.Contains(todos, t => t.Contains("not valid UTF-8", StringComparison.Ordinal));
        Assert.Equal(processBytesBefore, _app.ReadBytes("config/process/process.bpmn"));
        Assert.Contains("enablePdfCreation", _app.Read("config/applicationmetadata.json"), StringComparison.Ordinal);
    }

    [Fact]
    public async Task NonUtf8Metadata_IsRefused_NothingTouched()
    {
        var metadata = Metadata(FormDataType("modæl", "Task_1", enablePdfCreation: true));
        _app.WriteBytes("config/applicationmetadata.json", System.Text.Encoding.Latin1.GetBytes(metadata));
        _app.Write(
            "config/process/process.bpmn",
            Process(Task("Task_1", "data"), Flow("Flow_end", "Task_1", "EndEvent_1"), EndEvent("EndEvent_1"))
        );
        var metadataBytesBefore = _app.ReadBytes("config/applicationmetadata.json");
        var processBefore = _app.Read("config/process/process.bpmn");

        var todos = await MigrateTodos();

        Assert.Contains(todos, t => t.Contains("not valid UTF-8", StringComparison.Ordinal));
        Assert.Equal(metadataBytesBefore, _app.ReadBytes("config/applicationmetadata.json"));
        Assert.Equal(processBefore, _app.Read("config/process/process.bpmn"));
    }

    [Fact]
    public async Task MultipleProcessElements_WarnsAndKeepsFlag_ProcessUntouched()
    {
        // Multiple <process> elements form a legal BPMN collaboration; the migrator cannot know
        // which one to rewrite and must skip with an actionable message instead of throwing.
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(FormDataType("model", "Task_1", enablePdfCreation: true))
        );
        var bpmn = """
            <?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
              <bpmn:process id="Process_1">
                <bpmn:task id="Task_1" />
                <bpmn:endEvent id="EndEvent_1" />
                <bpmn:sequenceFlow id="Flow_end" sourceRef="Task_1" targetRef="EndEvent_1" />
              </bpmn:process>
              <bpmn:process id="Process_2" />
            </bpmn:definitions>
            """;
        _app.Write("config/process/process.bpmn", bpmn);

        var warnings = await Migrate();

        Assert.Contains(warnings, w => w.Contains("2 <process> element(s)", StringComparison.Ordinal));
        Assert.Equal(bpmn, _app.Read("config/process/process.bpmn"));
        Assert.Contains("enablePdfCreation", _app.Read("config/applicationmetadata.json"), StringComparison.Ordinal);
    }

    [Fact]
    public async Task DuplicateTaskIds_WarnsAndKeepsFlag_ProcessUntouched()
    {
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(FormDataType("model", "Task_1", enablePdfCreation: true))
        );
        var bpmn = Process(
            Task("Task_1", "data"),
            Task("Task_1", "data"),
            Flow("Flow_end", "Task_1", "EndEvent_1"),
            EndEvent("EndEvent_1")
        );
        _app.Write("config/process/process.bpmn", bpmn);

        var warnings = await Migrate();

        Assert.Contains(warnings, w => w.Contains("occurs 2 times", StringComparison.Ordinal));
        Assert.Equal(bpmn, _app.Read("config/process/process.bpmn"));
        Assert.Contains("enablePdfCreation", _app.Read("config/applicationmetadata.json"), StringComparison.Ordinal);
    }

    [Fact]
    public async Task CrlfProcessFileWithoutTrailingNewline_KeepsBothTraits()
    {
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(FormDataType("model", "Task_1", enablePdfCreation: true))
        );
        var bpmn = Process(Task("Task_1", "data"), Flow("Flow_end", "Task_1", "EndEvent_1"), EndEvent("EndEvent_1"))
            .ReplaceLineEndings("\r\n");
        Assert.False(bpmn.EndsWith('\n')); // fixture sanity: the builder emits no trailing newline
        _app.Write("config/process/process.bpmn", bpmn);

        await Migrate();

        var after = _app.Read("config/process/process.bpmn");
        Assert.Contains("PdfTask_Task_1", after, StringComparison.Ordinal);
        Assert.DoesNotContain('\n', after.Replace("\r\n", string.Empty)); // every newline is CRLF
        Assert.False(after.EndsWith('\n'), "expected no trailing newline to be introduced");
    }

    [Fact]
    public async Task LfProcessFileWithTrailingNewline_KeepsBothTraits()
    {
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(FormDataType("model", "Task_1", enablePdfCreation: true))
        );
        var bpmn =
            Process(Task("Task_1", "data"), Flow("Flow_end", "Task_1", "EndEvent_1"), EndEvent("EndEvent_1"))
                .ReplaceLineEndings("\n") + "\n";
        _app.Write("config/process/process.bpmn", bpmn);

        await Migrate();

        var after = _app.Read("config/process/process.bpmn");
        Assert.Contains("PdfTask_Task_1", after, StringComparison.Ordinal);
        Assert.DoesNotContain('\r', after);
        Assert.EndsWith("\n", after, StringComparison.Ordinal);
    }

    [Fact]
    public async Task RunThatChangesNothing_DoesNotRewriteTheProcessFile()
    {
        // Already-migrated task: the run strips the flag but must not reformat the process file.
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(FormDataType("model", "Task_1", enablePdfCreation: true))
        );
        var bpmn = Process(
            Task("Task_1", "data"),
            PdfServiceTask("PdfTask_Task_1"),
            Flow("Flow_end", "Task_1", "PdfTask_Task_1"),
            Flow("Flow_pdf", "PdfTask_Task_1", "EndEvent_1"),
            EndEvent("EndEvent_1")
        );
        _app.Write("config/process/process.bpmn", bpmn);
        var processBytesBefore = _app.ReadBytes("config/process/process.bpmn");

        await Migrate();

        Assert.Equal(processBytesBefore, _app.ReadBytes("config/process/process.bpmn"));
        Assert.DoesNotContain(
            "enablePdfCreation",
            _app.Read("config/applicationmetadata.json"),
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task TaskIdRefersToNonTaskElement_IsSkippedAndFlagKept()
    {
        // A stale/colliding taskId that names a gateway (or event) rather than a task must not have a
        // pdf service task spliced after it - that would move PDF generation to a wrong point. The
        // gateway has a single outgoing flow, so without the type guard it would have been rewritten.
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(FormDataType("model", "Gateway_1", enablePdfCreation: true))
        );
        var bpmn = Process(
            Task("Task_1", "data"),
            Gateway("Gateway_1"),
            Flow("Flow_to_gw", "Task_1", "Gateway_1"),
            Flow("Flow_end", "Gateway_1", "EndEvent_1"),
            EndEvent("EndEvent_1")
        );
        _app.Write("config/process/process.bpmn", bpmn);

        var warnings = await Migrate();

        Assert.Null(ElementById(ProcessAfter(), "PdfTask_Gateway_1"));
        Assert.Equal(bpmn, _app.Read("config/process/process.bpmn"));
        Assert.Contains(warnings, w => w.Contains("not a task", StringComparison.Ordinal));
        Assert.Contains("enablePdfCreation", _app.Read("config/applicationmetadata.json"), StringComparison.Ordinal);
    }

    [Fact]
    public async Task MalformedMetadataJson_IsRefused_NothingTouched()
    {
        // Invalid JSON must produce an actionable warning, not an unhandled exception (which would
        // abort the whole upgrade run).
        var metadata = "{ \"dataTypes\": [ }";
        _app.Write("config/applicationmetadata.json", metadata);
        _app.Write(
            "config/process/process.bpmn",
            Process(Task("Task_1", "data"), Flow("Flow_end", "Task_1", "EndEvent_1"), EndEvent("EndEvent_1"))
        );

        var todos = await MigrateTodos();

        Assert.Contains(todos, t => t.Contains("not valid JSON", StringComparison.Ordinal));
        Assert.Equal(metadata, _app.Read("config/applicationmetadata.json"));
    }

    [Fact]
    public async Task MalformedProcessXml_IsRefused_FlagKept()
    {
        // Invalid BPMN XML must produce an actionable warning and leave the flag in place, not throw.
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(FormDataType("model", "Task_1", enablePdfCreation: true))
        );
        var bpmn = "<root><child></root>";
        _app.Write("config/process/process.bpmn", bpmn);

        var todos = await MigrateTodos();

        Assert.Contains(todos, t => t.Contains("not valid XML", StringComparison.Ordinal));
        Assert.Equal(bpmn, _app.Read("config/process/process.bpmn"));
        Assert.Contains("enablePdfCreation", _app.Read("config/applicationmetadata.json"), StringComparison.Ordinal);
    }

    [Fact]
    public async Task CleanMigration_DoesNotRequireManualAction()
    {
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(FormDataType("model", "Task_1", enablePdfCreation: true))
        );
        _app.Write(
            "config/process/process.bpmn",
            Process(Task("Task_1", "data"), Flow("Flow_end", "Task_1", "EndEvent_1"), EndEvent("EndEvent_1"))
        );

        var result = await MigrateResult();

        Assert.Empty(result.Todos);
        Assert.Empty(result.Warnings);
    }

    [Fact]
    public async Task SkippedTask_RequiresManualAction()
    {
        // The task can't be found, so the flag is kept - the developer must finish the migration.
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(FormDataType("model", "Task_Ghost", enablePdfCreation: true))
        );
        _app.Write(
            "config/process/process.bpmn",
            Process(Task("Task_1", "data"), Flow("Flow_end", "Task_1", "EndEvent_1"), EndEvent("EndEvent_1"))
        );

        var result = await MigrateResult();

        Assert.NotEmpty(result.Todos);
    }

    [Fact]
    public async Task LegacyNoOp_DoesNotRequireManualAction()
    {
        // enablePdfCreation on an attachment was a no-op in v8; stripping it is a clean outcome, not
        // something needing manual follow-up.
        _app.Write("config/applicationmetadata.json", Metadata(AttachmentDataType("file", enablePdfCreation: true)));
        _app.Write(
            "config/process/process.bpmn",
            Process(Task("Task_1", "data"), Flow("Flow_end", "Task_1", "EndEvent_1"), EndEvent("EndEvent_1"))
        );

        var result = await MigrateResult();

        Assert.Empty(result.Todos);
    }

    [Fact]
    public async Task ExistingPdfTaskIdCollidesWithNonPdfElement_IsSkippedAndFlagKept()
    {
        // The "already migrated" short-circuit must not fire for an unrelated element that merely
        // shares the id - stripping the flag then would drop PDF generation with no task to replace it.
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(FormDataType("model", "Task_1", enablePdfCreation: true))
        );
        var bpmn = Process(
            Task("Task_1", "data"),
            Task("PdfTask_Task_1", "data"), // collides with the id the migrator would generate
            Flow("Flow_end", "Task_1", "EndEvent_1"),
            EndEvent("EndEvent_1")
        );
        _app.Write("config/process/process.bpmn", bpmn);

        var warnings = await Migrate();

        Assert.Equal(bpmn, _app.Read("config/process/process.bpmn"));
        Assert.Contains(warnings, w => w.Contains("not a PDF service task", StringComparison.Ordinal));
        Assert.Contains("enablePdfCreation", _app.Read("config/applicationmetadata.json"), StringComparison.Ordinal);
    }

    [Fact]
    public async Task ExistingNewFlowIdCollision_IsSkippedAndFlagKept()
    {
        // The generated flow id (Flow_PdfTask_{taskId}_to_{target}) must not duplicate an existing id,
        // which would produce invalid BPMN.
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(FormDataType("model", "Task_1", enablePdfCreation: true))
        );
        var bpmn = Process(
            StartEvent("StartEvent_1"),
            Task("Task_1", "data"),
            EndEvent("EndEvent_1"),
            Flow("Flow_start", "StartEvent_1", "Task_1"),
            Flow("Flow_end", "Task_1", "EndEvent_1"),
            Flow("Flow_PdfTask_Task_1_to_EndEvent_1", "StartEvent_1", "EndEvent_1") // collides with newFlowId
        );
        _app.Write("config/process/process.bpmn", bpmn);

        var warnings = await Migrate();

        Assert.Equal(bpmn, _app.Read("config/process/process.bpmn"));
        Assert.Contains(warnings, w => w.Contains("already exists", StringComparison.Ordinal));
        Assert.Contains("enablePdfCreation", _app.Read("config/applicationmetadata.json"), StringComparison.Ordinal);
    }

    [Fact]
    public async Task DefaultTemplateMetadata_NeedsNoPdfMigration()
    {
        // A freshly-scaffolded app's applicationmetadata.json has no enablePdfCreation, so the
        // migrator must do nothing and leave the file byte-for-byte untouched. The fixture is a
        // verbatim copy of src/App/template/v8/src/App/config/applicationmetadata.json; its [ORG]/[APP]
        // placeholders are valid JSON string values and irrelevant to this migrator.
        var metadata = await File.ReadAllTextAsync(
            Path.Combine(AppContext.BaseDirectory, "Upgrade/v8Tov9/TestData/template-appmetadata.json"),
            TestContext.Current.CancellationToken
        );
        _app.Write("config/applicationmetadata.json", metadata);

        var result = await MigrateResult();

        Assert.Empty(result.Warnings);
        Assert.Empty(result.Todos);
        Assert.Equal(metadata, _app.Read("config/applicationmetadata.json"));
    }

    [Fact]
    public async Task FlagWithUnexpectedCasing_IsDetectedAndMigrated()
    {
        // v8 binds applicationmetadata.json with Newtonsoft (case-insensitive), so a hand-edited
        // "EnablePdfCreation" generated PDFs under v8 and must be migrated, not silently ignored.
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(
                """
                    {
                      "id": "model",
                      "taskId": "Task_1",
                      "EnablePdfCreation": true,
                      "appLogic": {
                        "classRef": "Altinn.App.Models.model"
                      }
                    }
                """
            )
        );
        _app.Write(
            "config/process/process.bpmn",
            Process(Task("Task_1", "data"), Flow("Flow_end", "Task_1", "EndEvent_1"), EndEvent("EndEvent_1"))
        );

        await Migrate();

        Assert.NotNull(ElementById(ProcessAfter(), "PdfTask_Task_1"));
        Assert.DoesNotContain(
            "enablePdfCreation",
            _app.Read("config/applicationmetadata.json"),
            StringComparison.OrdinalIgnoreCase
        );
    }

    // A task whose settings name a custom PDF layout (pages.pdfLayoutName) had its legacy PDF rendered from
    // that layout; a PDF service task in automatic mode (autoPdfTaskIds) ignores it. The fixture is modeled on
    // a production v8 app: its data task's PDF layout has legacy Summary components pointing at components
    // on another page and Summary2 page summaries without a taskId, which all resolved against the task
    // folder. In the PDF service task's own layout set, as Altinn Studio sets up a custom PDF, they must name
    // the task instead.

    private const string DataTaskFolder = "ui/Task_1";
    private const string PdfTaskFolder = "ui/PdfTask_Task_1";
    private const string LayoutSchema =
        "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json";

    private static readonly string[] _pageOrder =
    [
        "01_Intro",
        "02_Kontaktinformasjon",
        "03_Behovsbeskrivelse",
        "04_Brukerbehov",
        "05_Gevinstpotensial",
        "06_Innovasjonspotensiale",
        "07_Organisering",
        "08_Forankring",
        "09_EgneMidler",
        "99_Summary",
    ];

    /// <summary>The fixture's PDF layout components, with the references they make into the task's pages.</summary>
    private static readonly string[] _pdfReceiptComponents =
    [
        """{ "id": "pdf-instance", "type": "InstanceInformation" }""",
        """{ "id": "02PdfReceiptHeader", "type": "Header", "size": "h2", "textResourceBindings": { "title": "02Header" } }""",
        """{ "id": "02PdfReceiptContactInformation", "type": "Summary", "componentRef": "02ContactInformation" }""",
        """{ "id": "02PdfReceiptBusinessesHeader", "type": "Summary", "componentRef": "02CooperatingBusinessesHeader" }""",
        """{ "id": "02PdfReceiptBusinesses", "type": "Summary", "componentRef": "02CooperatingBusinesses", "excludedChildren": ["02CooperatingBusinessesSearch"] }""",
        .. _pageOrder[2..9]
            .Select(page =>
                $$"""{ "id": "{{page[..2]}}PdfReceiptPage", "type": "Summary2", "target": { "type": "page", "id": "{{page}}" } }"""
            ),
    ];

    private static string Layout(params IEnumerable<string> components) =>
        $$"""
            {
              "$schema": "{{LayoutSchema}}",
              "data": {
                "layout": [
            """
        + "\n"
        + string.Join(",\n", components.Select(c => "      " + c))
        + "\n"
        + """
                ]
              }
            }
            """;

    /// <param name="pdfLayoutName">The raw JSON value of pages.pdfLayoutName, or null to leave it out.</param>
    /// <param name="defaultDataType">The folder's data type; v8 layout sets keep it in layout-sets.json.</param>
    private static string LayoutSettings(
        string? pdfLayoutName = "\"pdfReceipt\"",
        string? defaultDataType = "datamodel"
    )
    {
        var order = string.Join(", ", _pageOrder.Select(page => $"\"{page}\""));
        var pdfLayout = pdfLayoutName is null ? "" : $",\n    \"pdfLayoutName\": {pdfLayoutName}";
        var dataType = defaultDataType is null ? "" : $",\n  \"defaultDataType\": \"{defaultDataType}\"";
        return $$"""
            {
              "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layoutSettings.schema.v1.json",
              "pages": {
                "excludeFromPdf": ["01_Intro"],
                "order": [{{order}}],
                "showProgress": true{{pdfLayout}}
              }{{dataType}}
            }
            """;
    }

    /// <summary>
    /// Writes the fixture task's UI folder: its settings, its pages and its PDF layout, which gets
    /// <paramref name="extraPdfComponents"/> after the fixture's own.
    /// </summary>
    private void WriteTaskUi(string folder, string settings, params string[] extraPdfComponents)
    {
        _app.Write($"{folder}/Settings.json", settings);
        foreach (var page in _pageOrder)
        {
            // The components the PDF layout's legacy Summary components point at are on this page.
            string[] components =
                page == "02_Kontaktinformasjon"
                    ?
                    [
                        """{ "id": "02ContactInformation", "type": "Group", "children": ["02NameContactperson"] }""",
                        """{ "id": "02NameContactperson", "type": "Input", "dataModelBindings": { "simpleBinding": "Kontaktperson.Navn" } }""",
                        """{ "id": "02CooperatingBusinessesHeader", "type": "Header", "size": "h3", "textResourceBindings": { "title": "02BusinessesHeader" } }""",
                        """{ "id": "02CooperatingBusinesses", "type": "RepeatingGroup", "children": ["02CooperatingBusinessesSearch"], "dataModelBindings": { "group": "Samarbeidspartnere" } }""",
                        """{ "id": "02CooperatingBusinessesSearch", "type": "Input", "dataModelBindings": { "simpleBinding": "Samarbeidspartnere.Sok" } }""",
                    ]
                    :
                    [
                        $$"""{ "id": "{{page[..2]}}Header", "type": "Header", "size": "h2", "textResourceBindings": { "title": "{{page}}.title" } }""",
                    ];
            _app.Write($"{folder}/layouts/{page}.json", Layout(components));
        }

        // With a byte order mark, which the PDF service task's PDF layout keeps.
        _app.WriteBytes(
            $"{folder}/layouts/pdfReceipt.json",
            [
                0xEF,
                0xBB,
                0xBF,
                .. System.Text.Encoding.UTF8.GetBytes(Layout([.. _pdfReceiptComponents, .. extraPdfComponents])),
            ]
        );
    }

    /// <summary>
    /// The fixture's metadata: its data model and the (no-op) attachment type both have enablePdfCreation,
    /// as in the production app.
    /// </summary>
    private void WriteMetadataForTask1()
    {
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(
                """
                    {
                      "id": "ref-data-as-pdf",
                      "allowedContentTypes": ["application/pdf"],
                      "maxCount": 0,
                      "minCount": 0,
                      "enablePdfCreation": true
                    }
                """,
                """
                    {
                      "id": "datamodel",
                      "allowedContentTypes": ["application/xml"],
                      "appLogic": {
                        "autoCreate": true,
                        "classRef": "Altinn.App.Models.Form"
                      },
                      "taskId": "Task_1",
                      "maxCount": 1,
                      "minCount": 1,
                      "enablePdfCreation": true
                    }
                """
            )
        );
    }

    private void WriteDataThenFeedbackProcess() =>
        _app.Write(
            "config/process/process.bpmn",
            Process(
                StartEvent("StartEvent_1"),
                Task("Task_1", "data"),
                Task("Task_2", "feedback"),
                EndEvent("EndEvent_1"),
                Flow("SequenceFlow_1", "StartEvent_1", "Task_1"),
                Flow("SequenceFlow_2", "Task_1", "Task_2"),
                Flow("SequenceFlow_3", "Task_2", "EndEvent_1")
            )
        );

    /// <summary>Every file in the app folder <paramref name="folder"/>, by relative path, with its bytes.</summary>
    private SortedDictionary<string, byte[]> Files(string folder)
    {
        var root = Path.Combine(_app.Root, "App", folder);
        return new SortedDictionary<string, byte[]>(
            Directory
                .EnumerateFiles(root, "*", SearchOption.AllDirectories)
                .ToDictionary(file => Path.GetRelativePath(root, file).Replace('\\', '/'), File.ReadAllBytes),
            StringComparer.Ordinal
        );
    }

    private bool FolderExists(string folder) => Directory.Exists(Path.Combine(_app.Root, "App", folder));

    /// <summary>The PDF service task inserted after <paramref name="taskId"/>.</summary>
    private XElement PdfTaskAfter(string taskId) =>
        ElementById(ProcessAfter(), $"PdfTask_{taskId}")
        ?? throw new InvalidOperationException($"No PDF service task was inserted after {taskId}");

    private JsonNode Json(string file) =>
        JsonNode.Parse(
            _app.Read(file),
            documentOptions: new JsonDocumentOptions { CommentHandling = JsonCommentHandling.Skip }
        ) ?? throw new InvalidOperationException($"{file} holds no JSON");

    /// <summary>The components of the layout in the app file <paramref name="layoutFile"/>.</summary>
    private List<JsonNode> Components(string layoutFile) =>
        Json(layoutFile)["data"]?["layout"]?.AsArray().OfType<JsonNode>().ToList()
        ?? throw new InvalidOperationException($"{layoutFile} is not a layout");

    private static JsonNode ComponentById(IEnumerable<JsonNode> components, string id) =>
        components.Single(component => component["id"]?.GetValue<string>() == id);

    private static bool HasAutoPdfTaskIds(XElement pdfTask) =>
        pdfTask.Descendants().Any(e => e.Name.LocalName is "pdfConfig" or "autoPdfTaskIds");

    /// <summary>The files of the layout set Altinn Studio creates for a custom PDF named pdfReceipt.</summary>
    private static readonly string[] _pdfTaskLayoutSet =
    [
        "Settings.json",
        "layouts/ServiceTask.json",
        "layouts/pdfReceipt.json",
    ];

    [Fact]
    public async Task TaskWithCustomPdfLayout_GetsALayoutSetPointingAtTheTask()
    {
        WriteMetadataForTask1();
        WriteDataThenFeedbackProcess();
        WriteTaskUi(DataTaskFolder, LayoutSettings());
        var taskFolderBefore = Files(DataTaskFolder);

        var result = await MigrateResult();

        // T --flow--> PdfTask_T --newFlow--> X, with no autoPdfTaskIds: the service task renders its own layout set.
        var process = ProcessAfter();
        var pdfTask = ElementById(process, "PdfTask_Task_1");
        Assert.NotNull(pdfTask);
        Assert.Equal("pdf", pdfTask.Descendants().Single(e => e.Name.LocalName == "taskType").Value);
        Assert.False(HasAutoPdfTaskIds(pdfTask), "a PDF service task with a layout set must not be in automatic mode");
        Assert.Equal("PdfTask_Task_1", ElementById(process, "SequenceFlow_2")?.Attribute("targetRef")?.Value);
        Assert.Equal("Task_2", ElementById(process, "Flow_PdfTask_Task_1_to_Task_2")?.Attribute("targetRef")?.Value);

        // The layout set Altinn Studio creates for a custom PDF: the PDF layout, a waiting page and settings
        // naming both, bound to the task's data model. None of the task's pages are copied.
        Assert.Equal(_pdfTaskLayoutSet, Files(PdfTaskFolder).Keys);
        var settings = Json($"{PdfTaskFolder}/Settings.json");
        Assert.Equal("pdfReceipt", settings["pages"]?["pdfLayoutName"]?.GetValue<string>());
        Assert.Equal("""["ServiceTask"]""", settings["pages"]?["order"]?.ToJsonString());
        Assert.Equal("datamodel", settings["defaultDataType"]?.GetValue<string>());
        Assert.Equal<string?>(
            ["service_task.waiting_title", "service_task.waiting_body"],
            Components($"{PdfTaskFolder}/layouts/ServiceTask.json")
                .Select(c => c["textResourceBindings"]?["title"]?.GetValue<string>())
        );

        // Every summary now names Task_1. The page summaries only gained the taskId; the legacy Summary
        // components, which cannot show another task's components, became Summary2 component summaries.
        var pdfLayout = Components($"{PdfTaskFolder}/layouts/pdfReceipt.json");
        Assert.Equal<string?>(
            ["InstanceInformation", "Header", .. Enumerable.Repeat("Summary2", 10)],
            pdfLayout.Select(c => c["type"]?.GetValue<string>())
        );
        var targets = pdfLayout.Skip(2).Select(c => c["target"]).ToList();
        Assert.All(targets, target => Assert.Equal("Task_1", target?["taskId"]?.GetValue<string>()));
        Assert.Equal<string?>(
            ["component", "component", "component", .. Enumerable.Repeat("page", 7)],
            targets.Select(target => target?["type"]?.GetValue<string>())
        );
        Assert.Equal<string?>(
            ["02ContactInformation", "02CooperatingBusinessesHeader", "02CooperatingBusinesses", .. _pageOrder[2..9]],
            targets.Select(target => target?["id"]?.GetValue<string>())
        );
        Assert.Equal(
            """[{"componentId":"02CooperatingBusinessesSearch","hidden":true}]""",
            ComponentById(pdfLayout, "02PdfReceiptBusinesses")["overrides"]?.ToJsonString()
        );
        Assert.True(
            _app.ReadBytes($"{PdfTaskFolder}/layouts/pdfReceipt.json") is [0xEF, 0xBB, 0xBF, ..],
            "expected the PDF layout's byte order mark to be kept"
        );

        // The data task's own PDF layout, which the PDF no longer uses, is gone; the rest of its folder is not.
        var taskFolderAfter = Files(DataTaskFolder);
        Assert.Equal(taskFolderBefore.Keys.Where(path => path != "layouts/pdfReceipt.json"), taskFolderAfter.Keys);
        Assert.Equal(LayoutSettings(pdfLayoutName: null), _app.Read($"{DataTaskFolder}/Settings.json"));
        Assert.All(
            taskFolderAfter.Where(file => file.Key != "Settings.json"),
            file => Assert.Equal(taskFolderBefore[file.Key], file.Value)
        );
        Assert.DoesNotContain(
            "enablePdfCreation",
            _app.Read("config/applicationmetadata.json"),
            StringComparison.Ordinal
        );
        Assert.Empty(result.Todos);
        Assert.Equal(2, result.Warnings.Count);
        Assert.Contains(
            result.Warnings,
            w =>
                w.Contains("a layout set of its own in App/ui/PdfTask_Task_1", StringComparison.Ordinal)
                && w.Contains(
                    "Removed pdfLayoutName and layouts/pdfReceipt.json from App/ui/Task_1",
                    StringComparison.Ordinal
                )
        );
        Assert.Contains(
            result.Warnings,
            w =>
                w.Contains(
                    "[02PdfReceiptContactInformation, 02PdfReceiptBusinessesHeader, 02PdfReceiptBusinesses]",
                    StringComparison.Ordinal
                ) && w.Contains("may look different", StringComparison.Ordinal)
        );
    }

    [Fact]
    public async Task AfterLayoutSetMigration_PdfTaskLayoutSetKeepsTheTasksDataModel()
    {
        // The upgrade runs the layout-set migration before this one, so a v8 layout set has become the
        // task folder the PDF service task's layout set is made from, including the defaultDataType its
        // settings need to bind the task's data model.
        WriteMetadataForTask1();
        WriteDataThenFeedbackProcess();
        _app.Write(
            "ui/layout-sets.json",
            """
            {
              "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout-sets.schema.v1.json",
              "sets": [
                {
                  "id": "form",
                  "dataType": "datamodel",
                  "tasks": ["Task_1"]
                }
              ],
              "uiSettings": {}
            }
            """
        );
        WriteTaskUi("ui/form", LayoutSettings(defaultDataType: null));

        var layoutSets = new LayoutSetsToTaskUiMigrator(_app.Root).Migrate();
        var result = await MigrateResult();

        Assert.True(layoutSets.LayoutSetsDeleted);
        Assert.Empty(result.Todos);
        Assert.False(HasAutoPdfTaskIds(PdfTaskAfter("Task_1")));
        Assert.Equal(_pdfTaskLayoutSet, Files(PdfTaskFolder).Keys);
        var settings = Json($"{PdfTaskFolder}/Settings.json");
        Assert.Equal("datamodel", settings["defaultDataType"]?.GetValue<string>());
        Assert.Equal("pdfReceipt", settings["pages"]?["pdfLayoutName"]?.GetValue<string>());
        Assert.Null(Json($"{DataTaskFolder}/Settings.json")["pages"]?["pdfLayoutName"]);
        Assert.DoesNotContain("layouts/pdfReceipt.json", Files(DataTaskFolder).Keys);
    }

    [Fact]
    public async Task LayoutSetMigrationHeldBack_TaskWithCustomPdfLayout_IsSkippedUntilRerun()
    {
        // With layout-sets.json still in place the task has no task folder yet. Keep the flag, and migrate
        // the task once a re-run of the upgrade has moved the layout set.
        WriteMetadataForTask1();
        WriteDataThenFeedbackProcess();
        _app.Write(
            "ui/layout-sets.json",
            """{ "sets": [{ "id": "form", "dataType": "datamodel", "tasks": ["Task_1"] }] }"""
        );
        WriteTaskUi("ui/form", LayoutSettings(defaultDataType: null));
        var processBefore = _app.Read("config/process/process.bpmn");

        var heldBack = await MigrateResult();

        Assert.Equal(processBefore, _app.Read("config/process/process.bpmn"));
        Assert.False(FolderExists(PdfTaskFolder));
        Assert.Contains("enablePdfCreation", _app.Read("config/applicationmetadata.json"), StringComparison.Ordinal);
        Assert.Contains(heldBack.Warnings, w => w.Contains("layout set 'form'", StringComparison.Ordinal));
        Assert.Contains(heldBack.Todos, t => t.Contains("[Task_1]", StringComparison.Ordinal));

        new LayoutSetsToTaskUiMigrator(_app.Root).Migrate();
        var rerun = await MigrateResult();

        Assert.Empty(rerun.Todos);
        Assert.False(HasAutoPdfTaskIds(PdfTaskAfter("Task_1")));
        Assert.Equal(_pdfTaskLayoutSet, Files(PdfTaskFolder).Keys);
        Assert.DoesNotContain(
            "enablePdfCreation",
            _app.Read("config/applicationmetadata.json"),
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task LayoutSetMigrationHeldBack_TaskWithoutCustomPdfLayout_GetsAutomaticPdfTask()
    {
        WriteMetadataForTask1();
        WriteDataThenFeedbackProcess();
        _app.Write(
            "ui/layout-sets.json",
            """{ "sets": [{ "id": "form", "dataType": "datamodel", "tasks": ["Task_1"] }] }"""
        );
        WriteTaskUi("ui/form", LayoutSettings(pdfLayoutName: null, defaultDataType: null));

        var result = await MigrateResult();

        var pdfTask = PdfTaskAfter("Task_1");
        Assert.Equal("Task_1", pdfTask.Descendants().Single(e => e.Name.LocalName == "taskId").Value);
        Assert.False(FolderExists(PdfTaskFolder));
        Assert.Empty(result.Todos);
        Assert.Empty(result.Warnings);
    }

    [Fact]
    public async Task TasksWithAndWithoutCustomPdfLayout_EachGetTheirOwnMode()
    {
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(
                FormDataType("model1", "Task_1", enablePdfCreation: true),
                FormDataType("model2", "Task_2", enablePdfCreation: true)
            )
        );
        _app.Write(
            "config/process/process.bpmn",
            Process(
                Task("Task_1", "data"),
                Task("Task_2", "data"),
                EndEvent("EndEvent_1"),
                Flow("Flow_1", "Task_1", "Task_2"),
                Flow("Flow_2", "Task_2", "EndEvent_1")
            )
        );
        WriteTaskUi(DataTaskFolder, LayoutSettings(defaultDataType: "model1"));
        WriteTaskUi("ui/Task_2", LayoutSettings(pdfLayoutName: null, defaultDataType: "model2"));

        var result = await MigrateResult();

        Assert.False(HasAutoPdfTaskIds(PdfTaskAfter("Task_1")));
        Assert.Equal("Task_2", PdfTaskAfter("Task_2").Descendants().Single(e => e.Name.LocalName == "taskId").Value);
        Assert.Equal(_pdfTaskLayoutSet, Files(PdfTaskFolder).Keys);
        Assert.Equal("model1", Json($"{PdfTaskFolder}/Settings.json")["defaultDataType"]?.GetValue<string>());
        Assert.False(FolderExists("ui/PdfTask_Task_2"));
        Assert.Empty(result.Todos);
    }

    [Theory]
    [InlineData("\"\"")]
    [InlineData("null")]
    public async Task EmptyPdfLayoutName_GetsAutomaticPdfTask(string pdfLayoutName)
    {
        // The frontend only renders a custom layout for a non-empty pdfLayoutName.
        WriteMetadataForTask1();
        WriteDataThenFeedbackProcess();
        WriteTaskUi(DataTaskFolder, LayoutSettings(pdfLayoutName));

        var result = await MigrateResult();

        Assert.True(HasAutoPdfTaskIds(PdfTaskAfter("Task_1")));
        Assert.False(FolderExists(PdfTaskFolder));
        Assert.Empty(result.Warnings);
    }

    [Theory]
    [InlineData("{ \"pages\": { \"pdfLayoutName\": \"pdfReceipt\" ", "not valid JSON")]
    [InlineData("{ \"pages\": { \"pdfLayoutName\": true } }", "not a string")]
    public async Task UnreadableTaskSettings_AreSkippedAndFlagKept(string settings, string reason)
    {
        // Without knowing whether the task customized its PDF, neither mode is known to be faithful.
        WriteMetadataForTask1();
        WriteDataThenFeedbackProcess();
        WriteTaskUi(DataTaskFolder, settings);
        var processBefore = _app.Read("config/process/process.bpmn");

        var result = await MigrateResult();

        Assert.Equal(processBefore, _app.Read("config/process/process.bpmn"));
        Assert.False(FolderExists(PdfTaskFolder));
        Assert.Contains("enablePdfCreation", _app.Read("config/applicationmetadata.json"), StringComparison.Ordinal);
        Assert.Contains(result.Warnings, w => w.Contains(reason, StringComparison.Ordinal));
        Assert.Contains(result.Todos, t => t.Contains("Left enablePdfCreation", StringComparison.Ordinal));
    }

    [Theory]
    [InlineData("layouts/pdfReceipt.json")]
    [InlineData("Settings.json")]
    public async Task TaskFileThatIsNotUtf8_IsNamedAndFlagKept(string file)
    {
        // The PDF service task's layout set is written from both files, so they must decode as UTF-8, and the
        // warning names the one that does not.
        WriteMetadataForTask1();
        WriteDataThenFeedbackProcess();
        WriteTaskUi(DataTaskFolder, LayoutSettings());
        var path = $"{DataTaskFolder}/{file}";
        var text = _app.Read(path);
        var split = text.IndexOf("\"https://", StringComparison.Ordinal) + 1;
        _app.WriteBytes(
            path,
            [
                .. System.Text.Encoding.UTF8.GetBytes(text[..split]),
                0xFF,
                .. System.Text.Encoding.UTF8.GetBytes(text[split..]),
            ]
        );
        var processBefore = _app.Read("config/process/process.bpmn");

        var result = await MigrateResult();

        Assert.Equal(processBefore, _app.Read("config/process/process.bpmn"));
        Assert.False(FolderExists(PdfTaskFolder));
        Assert.Contains("enablePdfCreation", _app.Read("config/applicationmetadata.json"), StringComparison.Ordinal);
        Assert.Contains(result.Warnings, w => w.Contains($"App/{path} cannot be read", StringComparison.Ordinal));
        Assert.Contains(result.Todos, t => t.Contains("Left enablePdfCreation", StringComparison.Ordinal));
    }

    [Theory]
    [InlineData(
        """{ "id": "contact", "type": "Paragraph", "textResourceBindings": { "title": ["concat", "Kontakt: ", ["component", "02NameContactperson"]] } }""",
        "component 'contact' refers to component '02NameContactperson'"
    )]
    [InlineData(
        """{ "id": "more", "type": "Paragraph", "textResourceBindings": { "title": ["linkToPage", "Mer", "03_Behovsbeskrivelse"] } }""",
        "component 'more' links to page '03_Behovsbeskrivelse'"
    )]
    [InlineData(
        """{ "id": "maybe", "type": "Paragraph", "hidden": ["equals", ["displayValue", ["concat", "02", "NameContactperson"]], "x"] }""",
        "component 'maybe' refers to a component through an expression the upgrade cannot resolve"
    )]
    [InlineData("""{ "id": "nav", "type": "NavigationBar" }""", "component 'nav' is a NavigationBar")]
    public async Task PdfLayoutNeedingTheTaskFolder_GetsACopyOfItAndATodo(string component, string reason)
    {
        // The PDF layout cannot leave the task folder, so the PDF service task renders it from a copy of the
        // whole folder, as before the upgrade - and the conversion is left to a to-do that says what is left.
        WriteMetadataForTask1();
        WriteDataThenFeedbackProcess();
        WriteTaskUi(DataTaskFolder, LayoutSettings(), component);
        var taskFolderBefore = Files(DataTaskFolder);

        var result = await MigrateResult();

        Assert.False(HasAutoPdfTaskIds(PdfTaskAfter("Task_1")));
        Assert.Equal(taskFolderBefore, Files(PdfTaskFolder));
        Assert.DoesNotContain(
            "enablePdfCreation",
            _app.Read("config/applicationmetadata.json"),
            StringComparison.Ordinal
        );
        var todo = Assert.Single(result.Todos);
        Assert.Contains(reason, todo, StringComparison.Ordinal);
        Assert.Contains("copied App/ui/Task_1 to App/ui/PdfTask_Task_1", todo, StringComparison.Ordinal);
        Assert.Contains(
            "Removed pdfLayoutName and layouts/pdfReceipt.json from App/ui/Task_1",
            todo,
            StringComparison.Ordinal
        );
        Assert.Contains("target.taskId", todo, StringComparison.Ordinal);
        Assert.Contains("https://docs.altinn.studio/", todo, StringComparison.Ordinal);
    }

    [Fact]
    public async Task SummariesNamingATaskOrThePdfLayout_KeepPointingThere()
    {
        // A summary that already names a task keeps it, and one of a component on the PDF layout itself
        // resolves in the PDF service task's layout set, which has that layout too. A Summary2 without a
        // target summarizes a whole layout set: the task's. Comments are kept.
        WriteMetadataForTask1();
        WriteDataThenFeedbackProcess();
        WriteTaskUi(
            DataTaskFolder,
            LayoutSettings(),
            """{ "id": "local-group", "type": "Group", "children": ["local-text"] }""",
            """{ "id": "local-text", "type": "Paragraph", "textResourceBindings": { "title": "local.text" } }""",
            "// Summarizes the previous task too.\n"
                + """      { "id": "other-task", "type": "Summary2", "target": { "type": "layoutSet", "taskId": "Task_0" } }""",
            """{ "id": "own-group", "type": "Summary2", "target": { "type": "component", "id": "local-group" } }""",
            """{ "id": "whole-task", "type": "Summary2" }""",
            """{ "id": "legacy-local", "type": "Summary", "componentRef": "local-group", "largeGroup": true, "display": { "hideChangeButton": true } }"""
        );

        var result = await MigrateResult();

        var pdfLayout = Components($"{PdfTaskFolder}/layouts/pdfReceipt.json");
        Assert.Equal(
            """{"type":"layoutSet","taskId":"Task_0"}""",
            ComponentById(pdfLayout, "other-task")["target"]?.ToJsonString()
        );
        Assert.Equal(
            """{"type":"component","id":"local-group"}""",
            ComponentById(pdfLayout, "own-group")["target"]?.ToJsonString()
        );
        Assert.Equal(
            """{"type":"layoutSet","taskId":"Task_1"}""",
            ComponentById(pdfLayout, "whole-task")["target"]?.ToJsonString()
        );
        Assert.Equal(
            """{"id":"legacy-local","type":"Summary2","target":{"type":"component","id":"local-group"}}""",
            ComponentById(pdfLayout, "legacy-local").ToJsonString()
        );
        Assert.Contains(
            "// Summarizes the previous task too.",
            _app.Read($"{PdfTaskFolder}/layouts/pdfReceipt.json"),
            StringComparison.Ordinal
        );
        Assert.Empty(result.Todos);
        Assert.Contains(
            result.Warnings,
            w =>
                w.Contains(
                    "Dropped display, largeGroup, which Summary2 has no counterpart for",
                    StringComparison.Ordinal
                )
        );
    }

    [Fact]
    public async Task PdfTaskSettings_KeepHideAppNameInPdf_AndTakeTheDataModelFromMetadataWhenMissing()
    {
        // A folder's own hideAppNameInPdf overrides the app's for the PDF it renders, so it moves along. A
        // task folder without defaultDataType gets the task's data model from applicationmetadata.json.
        WriteMetadataForTask1();
        WriteDataThenFeedbackProcess();
        WriteTaskUi(
            DataTaskFolder,
            """
            {
              "pages": {
                "order": ["01_Intro"],
                "pdfLayoutName": "pdfReceipt",
                "hideAppNameInPdf": ["equals", ["dataModel", "Anonym"], true]
              }
            }
            """
        );

        await MigrateResult();

        var settings = Json($"{PdfTaskFolder}/Settings.json");
        Assert.Equal(
            """["equals",["dataModel","Anonym"],true]""",
            settings["pages"]?["hideAppNameInPdf"]?.ToJsonString()
        );
        Assert.Equal("datamodel", settings["defaultDataType"]?.GetValue<string>());
        Assert.Equal(
            "https://altinncdn.no/schemas/json/layout/layoutSettings.schema.v1.json",
            settings["$schema"]?.GetValue<string>()
        );
        Assert.Equal(LayoutSchema, Json($"{PdfTaskFolder}/layouts/ServiceTask.json")["$schema"]?.GetValue<string>());
    }

    [Fact]
    public async Task PdfLayoutNameWithoutItsLayout_IsSkippedAndFlagKept()
    {
        WriteMetadataForTask1();
        WriteDataThenFeedbackProcess();
        WriteTaskUi(DataTaskFolder, LayoutSettings());
        File.Delete(Path.Combine(_app.Root, "App", DataTaskFolder, "layouts", "pdfReceipt.json"));
        var processBefore = _app.Read("config/process/process.bpmn");

        var result = await MigrateResult();

        Assert.Equal(processBefore, _app.Read("config/process/process.bpmn"));
        Assert.False(FolderExists(PdfTaskFolder));
        Assert.Contains("enablePdfCreation", _app.Read("config/applicationmetadata.json"), StringComparison.Ordinal);
        Assert.Contains(
            result.Warnings,
            w =>
                w.Contains(
                    "names the layout 'pdfReceipt', which App/ui/Task_1/layouts does not have",
                    StringComparison.Ordinal
                )
        );
        Assert.Contains(result.Todos, t => t.Contains("Left enablePdfCreation", StringComparison.Ordinal));
    }

    [Fact]
    public async Task PdfTaskFolderHoldingOtherContent_IsSkippedAndLeftAlone()
    {
        WriteMetadataForTask1();
        WriteDataThenFeedbackProcess();
        WriteTaskUi(DataTaskFolder, LayoutSettings());
        _app.Write($"{PdfTaskFolder}/Settings.json", "{}");
        var processBefore = _app.Read("config/process/process.bpmn");

        var result = await MigrateResult();

        Assert.Equal(processBefore, _app.Read("config/process/process.bpmn"));
        Assert.Equal("{}", _app.Read($"{PdfTaskFolder}/Settings.json"));
        Assert.Single(Files(PdfTaskFolder));
        Assert.Contains("enablePdfCreation", _app.Read("config/applicationmetadata.json"), StringComparison.Ordinal);
        Assert.Contains(
            result.Warnings,
            w => w.Contains("already exists with other content", StringComparison.Ordinal)
        );
        Assert.Contains(result.Todos, t => t.Contains("Left enablePdfCreation", StringComparison.Ordinal));
    }

    [Fact]
    public async Task InterruptedFolderWrite_IsCompletedByTheNextRun()
    {
        // A run that stopped part-way through writing the folder, before writing the process, left some of
        // its files; the next run completes the folder instead of reporting a collision.
        WriteMetadataForTask1();
        WriteDataThenFeedbackProcess();
        WriteTaskUi(DataTaskFolder, LayoutSettings());
        var metadataBefore = _app.Read("config/applicationmetadata.json");
        var processBefore = _app.Read("config/process/process.bpmn");
        var taskFolderBefore = Files(DataTaskFolder);
        await MigrateResult();
        var completeFolder = Files(PdfTaskFolder);

        _app.Write("config/applicationmetadata.json", metadataBefore);
        _app.Write("config/process/process.bpmn", processBefore);
        foreach (var (path, content) in taskFolderBefore)
            _app.WriteBytes($"{DataTaskFolder}/{path}", content);
        File.Delete(Path.Combine(_app.Root, "App", PdfTaskFolder, "layouts", "pdfReceipt.json"));
        var result = await MigrateResult();

        Assert.Empty(result.Todos);
        Assert.Equal(completeFolder, Files(PdfTaskFolder));
        Assert.False(HasAutoPdfTaskIds(PdfTaskAfter("Task_1")));
    }

    [Fact]
    public async Task RerunAfterPartialMigration_KeepsThePdfTaskLayoutSetWithoutNewTodos()
    {
        // Task_2's settings are broken on the first run, so the flag is kept while Task_1 is migrated. After
        // the fix, the re-run migrates Task_2 and recognizes Task_1's service task and layout set as done.
        _app.Write(
            "config/applicationmetadata.json",
            Metadata(
                FormDataType("model1", "Task_1", enablePdfCreation: true),
                FormDataType("model2", "Task_2", enablePdfCreation: true)
            )
        );
        _app.Write(
            "config/process/process.bpmn",
            Process(
                Task("Task_1", "data"),
                Task("Task_2", "data"),
                EndEvent("EndEvent_1"),
                Flow("Flow_1", "Task_1", "Task_2"),
                Flow("Flow_2", "Task_2", "EndEvent_1")
            )
        );
        WriteTaskUi(DataTaskFolder, LayoutSettings(defaultDataType: "model1"));
        _app.Write("ui/Task_2/Settings.json", "{ not json");

        var first = await MigrateResult();
        var layoutSetAfterFirst = Files(PdfTaskFolder);
        _app.Write("ui/Task_2/Settings.json", LayoutSettings(pdfLayoutName: null, defaultDataType: "model2"));
        var second = await MigrateResult();

        Assert.Contains(first.Todos, t => t.Contains("[Task_2]", StringComparison.Ordinal));
        Assert.Empty(second.Todos);
        Assert.Equal(_pdfTaskLayoutSet, layoutSetAfterFirst.Keys);
        Assert.Equal(layoutSetAfterFirst, Files(PdfTaskFolder));
        Assert.False(HasAutoPdfTaskIds(PdfTaskAfter("Task_1")));
        Assert.True(HasAutoPdfTaskIds(PdfTaskAfter("Task_2")));
        Assert.DoesNotContain(
            "enablePdfCreation",
            _app.Read("config/applicationmetadata.json"),
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task DataTaskPdfLayoutThatIsAlsoAPage_IsKept()
    {
        WriteMetadataForTask1();
        WriteDataThenFeedbackProcess();
        var settings = """
            {
              "pages": {
                "order": ["01_Intro", "pdfReceipt"],
                "pdfLayoutName": "pdfReceipt"
              },
              "defaultDataType": "datamodel"
            }
            """;
        WriteTaskUi(DataTaskFolder, settings);

        var result = await MigrateResult();

        Assert.Equal(_pdfTaskLayoutSet, Files(PdfTaskFolder).Keys);
        Assert.Equal(settings, _app.Read($"{DataTaskFolder}/Settings.json"));
        Assert.Contains("layouts/pdfReceipt.json", Files(DataTaskFolder).Keys);
        Assert.Contains(
            result.Warnings,
            w =>
                w.Contains(
                    "Kept pdfLayoutName and layouts/pdfReceipt.json in App/ui/Task_1, which the PDF no longer uses, "
                        + "since 'pdfReceipt' is one of the task's pages too",
                    StringComparison.Ordinal
                )
        );
    }

    [Theory]
    [InlineData(
        "ui/Task_1/layouts/99_Summary.json",
        """
            {
              "data": {
                "layout": [
                  { "id": "to-receipt", "type": "Paragraph", "textResourceBindings": { "title": ["linkToPage", "Kvittering", "pdfReceipt"] } }
                ]
              }
            }
            """
    )]
    [InlineData(
        "logic/ReceiptPages.cs",
        """internal static class ReceiptPages { public const string Pdf = "pdfReceipt"; }"""
    )]
    public async Task DataTaskPdfLayoutReferredToElsewhere_IsKept(string file, string content)
    {
        WriteMetadataForTask1();
        WriteDataThenFeedbackProcess();
        WriteTaskUi(DataTaskFolder, LayoutSettings());
        _app.Write(file, content);

        var result = await MigrateResult();

        Assert.Equal(_pdfTaskLayoutSet, Files(PdfTaskFolder).Keys);
        Assert.Equal(LayoutSettings(), _app.Read($"{DataTaskFolder}/Settings.json"));
        Assert.Contains("layouts/pdfReceipt.json", Files(DataTaskFolder).Keys);
        Assert.Contains(
            result.Warnings,
            w => w.Contains($"since App/{file} refers to 'pdfReceipt'", StringComparison.Ordinal)
        );
    }

    [Fact]
    public async Task DataTaskSettingsThatCannotLoseJustPdfLayoutName_AreKept()
    {
        // pdfLayoutName shares its line with other settings, so it cannot be removed on its own without
        // reformatting the developer's file.
        WriteMetadataForTask1();
        WriteDataThenFeedbackProcess();
        var settings = """
            { "pages": { "order": ["01_Intro"], "pdfLayoutName": "pdfReceipt" }, "defaultDataType": "datamodel" }
            """;
        WriteTaskUi(DataTaskFolder, settings);

        var result = await MigrateResult();

        Assert.Equal(settings, _app.Read($"{DataTaskFolder}/Settings.json"));
        Assert.Contains("layouts/pdfReceipt.json", Files(DataTaskFolder).Keys);
        Assert.Contains(
            result.Warnings,
            w =>
                w.Contains(
                    "pdfLayoutName cannot be removed from App/ui/Task_1/Settings.json without changing the rest of it",
                    StringComparison.Ordinal
                )
        );
    }

    [Fact]
    public async Task DataTaskSettingsWithoutPdfLayoutName_KeepTheirFormatting()
    {
        // pdfLayoutName is the last property of pages here, so the comma before it goes too - and only it:
        // the byte order mark, the CRLF line endings and the trailing newline stay.
        WriteMetadataForTask1();
        WriteDataThenFeedbackProcess();
        WriteTaskUi(DataTaskFolder, LayoutSettings());
        _app.WriteBytes(
            $"{DataTaskFolder}/Settings.json",
            [
                0xEF,
                0xBB,
                0xBF,
                .. System.Text.Encoding.UTF8.GetBytes(LayoutSettings().ReplaceLineEndings("\r\n") + "\r\n"),
            ]
        );

        await MigrateResult();

        Assert.Equal(
            [
                0xEF,
                0xBB,
                0xBF,
                .. System.Text.Encoding.UTF8.GetBytes(
                    LayoutSettings(pdfLayoutName: null).ReplaceLineEndings("\r\n") + "\r\n"
                ),
            ],
            _app.ReadBytes($"{DataTaskFolder}/Settings.json")
        );
    }

    [Fact]
    public async Task ExistingPdfTaskWithoutUiFolder_ForTaskWithCustomPdfLayout_ReportsTodo()
    {
        // A PDF service task already in the process (e.g. from an older upgrade that left the flag in place)
        // is not ours to change, but without a layout set it does not render the custom layout: say so.
        WriteMetadataForTask1();
        _app.Write(
            "config/process/process.bpmn",
            Process(
                Task("Task_1", "data"),
                PdfServiceTask("PdfTask_Task_1"),
                EndEvent("EndEvent_1"),
                Flow("Flow_1", "Task_1", "PdfTask_Task_1"),
                Flow("Flow_2", "PdfTask_Task_1", "EndEvent_1")
            )
        );
        WriteTaskUi(DataTaskFolder, LayoutSettings());
        var processBefore = _app.Read("config/process/process.bpmn");

        var result = await MigrateResult();

        Assert.Equal(processBefore, _app.Read("config/process/process.bpmn"));
        Assert.False(FolderExists(PdfTaskFolder));
        var todo = Assert.Single(result.Todos);
        Assert.Contains("does not render the custom layout 'pdfReceipt'", todo, StringComparison.Ordinal);
        Assert.Contains("App/ui/PdfTask_Task_1 with layouts/pdfReceipt.json", todo, StringComparison.Ordinal);
        Assert.Contains("remove autoPdfTaskIds from 'PdfTask_Task_1'", todo, StringComparison.Ordinal);
        Assert.DoesNotContain(
            "enablePdfCreation",
            _app.Read("config/applicationmetadata.json"),
            StringComparison.Ordinal
        );
    }
}
