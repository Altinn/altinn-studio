using System.Xml.Linq;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.PdfServiceTaskMigration;
using static Studioctl.Tests.Upgrade.v8Tov9.BpmnBuilder;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class PdfServiceTaskMigratorTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private async Task<MigrationResult> MigrateResult() => await new PdfServiceTaskMigrator(_app.Root).Migrate();

    private async Task<IReadOnlyList<string>> Migrate() => (await MigrateResult()).Warnings;

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

        var warnings = await Migrate();

        Assert.Contains("enablePdfCreation", _app.Read("config/applicationmetadata.json"), StringComparison.Ordinal);
        Assert.Contains(warnings, w => w.Contains("Task_Ghost", StringComparison.Ordinal));
        Assert.Contains(warnings, w => w.Contains("Left enablePdfCreation", StringComparison.Ordinal));
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

        var warnings = await Migrate();

        Assert.Contains(warnings, w => w.Contains("not valid UTF-8", StringComparison.Ordinal));
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

        var warnings = await Migrate();

        Assert.Contains(warnings, w => w.Contains("not valid UTF-8", StringComparison.Ordinal));
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

        var warnings = await Migrate();

        Assert.Contains(warnings, w => w.Contains("not valid JSON", StringComparison.Ordinal));
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

        var warnings = await Migrate();

        Assert.Contains(warnings, w => w.Contains("not valid XML", StringComparison.Ordinal));
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

        Assert.False(result.ManualActionRequired);
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

        Assert.True(result.ManualActionRequired);
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

        Assert.False(result.ManualActionRequired);
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
}
