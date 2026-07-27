using System.Xml.Linq;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.EFormidlingServiceTaskMigration;
using static Studioctl.Tests.Upgrade.v8Tov9.BpmnBuilder;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class EFormidlingServiceTaskMigratorTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private async Task<MigrationResult> MigrateResult() =>
        await new EFormidlingServiceTaskMigrator(_app.Root).Migrate();

    private async Task<IReadOnlyList<string>> Migrate() => (await MigrateResult()).Warnings;

    private XElement ProcessAfter()
    {
        var doc = XDocument.Parse(_app.Read("config/process/process.bpmn"));
        var root = doc.Root ?? throw new InvalidOperationException("process.bpmn has no root element");
        return root.Elements().Single(e => e.Name.LocalName == "process");
    }

    private static XElement? ElementById(XElement process, string id) =>
        process.Elements().FirstOrDefault(e => e.Attribute("id")?.Value == id);

    private static XElement RequireById(XElement process, string id)
    {
        var element = ElementById(process, id);
        Assert.NotNull(element);
        return element;
    }

    private static XElement EFormidlingConfig(XElement serviceTask) =>
        serviceTask.Descendants().Single(e => e.Name.LocalName == "eFormidlingConfig");

    /// <summary>A linear StartEvent → Task_1 → EndEvent_1 process (Task_1 is the sendAfterTaskId anchor).</summary>
    private static string LinearProcess() =>
        Process(
            StartEvent("StartEvent_1"),
            Task("Task_1", "data"),
            EndEvent("EndEvent_1"),
            Flow("Flow_start", "StartEvent_1", "Task_1"),
            Flow("Flow_end", "Task_1", "EndEvent_1")
        );

    /// <summary>applicationmetadata.json with a legacy eFormidling block; pass properties as raw JSON lines.</summary>
    private static string MetadataWithEFormidling(params string[] eFormidlingProperties) =>
        """
            {
              "id": "ttd/myapp",
              "org": "ttd",
              "eFormidling": {
            """
        + "\n"
        + string.Join(",\n", eFormidlingProperties)
        + "\n"
        + """
              },
              "dataTypes": []
            }
            """;

    private static readonly string[] _fullConfig =
    [
        "    \"receiver\": \"910075918\"",
        "    \"sendAfterTaskId\": \"Task_1\"",
        "    \"process\": \"urn:no:difi:profile:arkivmelding:administrasjon:ver1.0\"",
        "    \"standard\": \"urn:no:difi:arkivmelding:xsd::arkivmelding\"",
        "    \"typeVersion\": \"2.0\"",
        "    \"type\": \"arkivmelding\"",
        "    \"securityLevel\": 3",
        "    \"dataTypes\": [\"model\"]",
    ];

    private void WriteEnableEFormidling(bool enabled, string? environment = null) =>
        _app.Write(
            environment is null ? "appsettings.json" : $"appsettings.{environment}.json",
            $$"""
            {
              "AppSettings": {
                "EnableEFormidling": {{(enabled ? "true" : "false")}}
              }
            }
            """
        );

    [Fact]
    public async Task LegacyConfig_WithGateEnabled_GetsServiceTaskAndBlockStripped()
    {
        _app.Write("config/applicationmetadata.json", MetadataWithEFormidling(_fullConfig));
        _app.Write("config/process/process.bpmn", LinearProcess());
        WriteEnableEFormidling(enabled: true);
        // A registration keeps the advisory warning quiet so a clean migration reports no follow-up.
        _app.Write("Program.cs", "services.AddEFormidlingServices2<Metadata, Receiver>();");

        var result = await MigrateResult();
        var process = ProcessAfter();

        // Task_1 --Flow_end--> EFormidlingTask_Task_1 --newFlow--> EndEvent_1
        var task = ElementById(process, "EFormidlingTask_Task_1");
        Assert.NotNull(task);
        Assert.Equal("serviceTask", task.Name.LocalName);
        Assert.Equal("eFormidling", task.Descendants().Single(e => e.Name.LocalName == "taskType").Value);
        Assert.Equal("EFormidlingTask_Task_1", ElementById(process, "Flow_end")?.Attribute("targetRef")?.Value);

        var config = EFormidlingConfig(task);
        Assert.Equal("910075918", config.Elements().Single(e => e.Name.LocalName == "receiver").Value);
        Assert.Equal("arkivmelding", config.Elements().Single(e => e.Name.LocalName == "type").Value);
        Assert.Equal("3", config.Elements().Single(e => e.Name.LocalName == "securityLevel").Value);
        Assert.Equal("model", config.Descendants().Single(e => e.Name.LocalName == "dataType").Value);
        // Gate enabled everywhere -> no <disabled> element.
        Assert.DoesNotContain(config.Elements(), e => e.Name.LocalName == "disabled");

        Assert.DoesNotContain("eFormidling", _app.Read("config/applicationmetadata.json"), StringComparison.Ordinal);
        Assert.DoesNotContain("EnableEFormidling", _app.Read("appsettings.json"), StringComparison.Ordinal);
        Assert.False(result.ManualActionRequired);
        Assert.Empty(result.Warnings);
    }

    [Fact]
    public async Task GateDisabledEverywhere_TaskIsDisabled_NoManualAction()
    {
        _app.Write("config/applicationmetadata.json", MetadataWithEFormidling(_fullConfig));
        _app.Write("config/process/process.bpmn", LinearProcess());
        // No appsettings enabling the flag -> the gate defaults to disabled everywhere.

        var result = await MigrateResult();
        var config = EFormidlingConfig(RequireById(ProcessAfter(), "EFormidlingTask_Task_1"));

        var disabled = config.Elements().Single(e => e.Name.LocalName == "disabled");
        Assert.Null(disabled.Attribute("env"));
        Assert.Equal("true", disabled.Value);
        Assert.Contains(result.Warnings, w => w.Contains("not enabled in any appsettings", StringComparison.Ordinal));
        Assert.False(result.ManualActionRequired);
    }

    [Fact]
    public async Task GateDiffersPerEnvironment_EmitsPerEnvironmentDisabled()
    {
        _app.Write("config/applicationmetadata.json", MetadataWithEFormidling(_fullConfig));
        _app.Write("config/process/process.bpmn", LinearProcess());
        WriteEnableEFormidling(enabled: true); // base: enabled
        WriteEnableEFormidling(enabled: false, environment: "Production"); // production: disabled

        var result = await MigrateResult();
        var config = EFormidlingConfig(RequireById(ProcessAfter(), "EFormidlingTask_Task_1"));

        var disabled = config.Elements().Where(e => e.Name.LocalName == "disabled").ToList();
        Assert.Single(disabled);
        Assert.Equal("production", disabled[0].Attribute("env")?.Value);
        Assert.Equal("true", disabled[0].Value);
        Assert.Contains(result.Warnings, w => w.Contains("differed per environment", StringComparison.Ordinal));
    }

    [Fact]
    public async Task LegacyPdfTaskForSameTask_EFormidlingIsInsertedAfterIt()
    {
        _app.Write("config/applicationmetadata.json", MetadataWithEFormidling(_fullConfig));
        // Job 8 has already run: Task_1 --> PdfTask_Task_1 --> EndEvent_1. The shipment went out after
        // the PDF in v8, so the eFormidling task must land after the PDF task.
        _app.Write(
            "config/process/process.bpmn",
            Process(
                StartEvent("StartEvent_1"),
                Task("Task_1", "data"),
                PdfServiceTask("PdfTask_Task_1"),
                EndEvent("EndEvent_1"),
                Flow("Flow_start", "StartEvent_1", "Task_1"),
                Flow("Flow_pdf", "Task_1", "PdfTask_Task_1"),
                Flow("Flow_end", "PdfTask_Task_1", "EndEvent_1")
            )
        );
        WriteEnableEFormidling(enabled: true);

        await Migrate();
        var process = ProcessAfter();

        // PdfTask_Task_1 --Flow_end--> EFormidlingTask_Task_1 --newFlow--> EndEvent_1
        Assert.NotNull(ElementById(process, "EFormidlingTask_Task_1"));
        Assert.Equal("EFormidlingTask_Task_1", ElementById(process, "Flow_end")?.Attribute("targetRef")?.Value);
        var newFlow = ElementById(process, "Flow_EFormidlingTask_Task_1_to_EndEvent_1");
        Assert.Equal("EndEvent_1", newFlow?.Attribute("targetRef")?.Value);
    }

    [Fact]
    public async Task EmptyBlock_IsStripped_NoTask_NoManualAction()
    {
        _app.Write(
            "config/applicationmetadata.json",
            """
            {
              "id": "ttd/myapp",
              "eFormidling": {},
              "dataTypes": []
            }
            """
        );
        _app.Write("config/process/process.bpmn", LinearProcess());

        var result = await MigrateResult();

        Assert.DoesNotContain("eFormidling", _app.Read("config/applicationmetadata.json"), StringComparison.Ordinal);
        Assert.Null(ElementById(ProcessAfter(), "EFormidlingTask_Task_1"));
        Assert.Contains(result.Warnings, w => w.Contains("empty legacy eFormidling block", StringComparison.Ordinal));
        Assert.False(result.ManualActionRequired);
    }

    [Fact]
    public async Task NoSendAfterTaskId_LeavesBlock_RequiresManualAction()
    {
        _app.Write(
            "config/applicationmetadata.json",
            MetadataWithEFormidling("    \"receiver\": \"910075918\"", "    \"type\": \"arkivmelding\"")
        );
        _app.Write("config/process/process.bpmn", LinearProcess());

        var result = await MigrateResult();

        Assert.Null(ElementById(ProcessAfter(), "EFormidlingTask_Task_1"));
        Assert.Contains("eFormidling", _app.Read("config/applicationmetadata.json"), StringComparison.Ordinal);
        Assert.Contains(result.Warnings, w => w.Contains("no sendAfterTaskId", StringComparison.Ordinal));
        Assert.True(result.ManualActionRequired);
    }

    [Fact]
    public async Task AnchorTaskMissingFromProcess_IsSkipped_BlockKept_ManualAction()
    {
        _app.Write(
            "config/applicationmetadata.json",
            MetadataWithEFormidling("    \"sendAfterTaskId\": \"Task_Ghost\"", "    \"receiver\": \"910075918\"")
        );
        _app.Write("config/process/process.bpmn", LinearProcess());

        var result = await MigrateResult();

        Assert.Contains("eFormidling", _app.Read("config/applicationmetadata.json"), StringComparison.Ordinal);
        Assert.Contains(result.Warnings, w => w.Contains("Task_Ghost", StringComparison.Ordinal));
        Assert.True(result.ManualActionRequired);
    }

    [Fact]
    public async Task SecondRun_IsIdempotent()
    {
        _app.Write("config/applicationmetadata.json", MetadataWithEFormidling(_fullConfig));
        _app.Write("config/process/process.bpmn", LinearProcess());
        WriteEnableEFormidling(enabled: true);

        await Migrate();
        var afterFirst = _app.Read("config/process/process.bpmn");
        var warnings = await Migrate();
        var afterSecond = _app.Read("config/process/process.bpmn");

        // The first run stripped the legacy block, so the second run is a clean no-op: the process is
        // untouched, the single inserted task remains, and nothing is reported.
        Assert.Equal(afterFirst, afterSecond);
        Assert.Single(ProcessAfter().Elements(), e => e.Attribute("id")?.Value == "EFormidlingTask_Task_1");
        Assert.Empty(warnings);
    }

    [Fact]
    public async Task ServiceId_IsDroppedWithWarning()
    {
        _app.Write(
            "config/applicationmetadata.json",
            MetadataWithEFormidling([.. _fullConfig, "    \"serviceId\": \"DPO\""])
        );
        _app.Write("config/process/process.bpmn", LinearProcess());
        WriteEnableEFormidling(enabled: true);

        var warnings = await Migrate();
        var config = EFormidlingConfig(RequireById(ProcessAfter(), "EFormidlingTask_Task_1"));

        Assert.DoesNotContain(config.Elements(), e => e.Name.LocalName == "serviceId");
        Assert.Contains(warnings, w => w.Contains("serviceId", StringComparison.Ordinal));
    }

    [Fact]
    public async Task TaskAlreadyPresentButBlockNotStripped_IsTreatedAsMigrated_AndBlockStripped()
    {
        // A prior run inserted the task but did not strip the block (e.g. it was interrupted). The
        // task already exists, so re-running must not duplicate it, but should finish the strip.
        _app.Write("config/applicationmetadata.json", MetadataWithEFormidling(_fullConfig));
        _app.Write(
            "config/process/process.bpmn",
            Process(
                StartEvent("StartEvent_1"),
                Task("Task_1", "data"),
                Task("EFormidlingTask_Task_1", "eFormidling"),
                EndEvent("EndEvent_1"),
                Flow("Flow_start", "StartEvent_1", "Task_1"),
                Flow("Flow_mid", "Task_1", "EFormidlingTask_Task_1"),
                Flow("Flow_end", "EFormidlingTask_Task_1", "EndEvent_1")
            )
        );
        WriteEnableEFormidling(enabled: true);

        var warnings = await Migrate();

        Assert.DoesNotContain("eFormidling", _app.Read("config/applicationmetadata.json"), StringComparison.Ordinal);
        Assert.Single(ProcessAfter().Elements(), e => e.Attribute("id")?.Value == "EFormidlingTask_Task_1");
        Assert.Contains(warnings, w => w.Contains("already migrated", StringComparison.Ordinal));
    }

    [Fact]
    public async Task MissingRequiredValues_WarnsButStillInsertsTask()
    {
        _app.Write(
            "config/applicationmetadata.json",
            MetadataWithEFormidling("    \"sendAfterTaskId\": \"Task_1\"", "    \"receiver\": \"910075918\"")
        );
        _app.Write("config/process/process.bpmn", LinearProcess());
        WriteEnableEFormidling(enabled: true);

        var warnings = await Migrate();

        Assert.NotNull(ElementById(ProcessAfter(), "EFormidlingTask_Task_1"));
        Assert.Contains(warnings, w => w.Contains("missing value(s)", StringComparison.Ordinal));
    }

    [Fact]
    public async Task NoEFormidlingBlock_IsNoOp()
    {
        _app.Write(
            "config/applicationmetadata.json",
            """
            {
              "id": "ttd/myapp",
              "dataTypes": []
            }
            """
        );
        _app.Write("config/process/process.bpmn", LinearProcess());

        var result = await MigrateResult();

        Assert.Empty(result.Warnings);
        Assert.False(result.ManualActionRequired);
        Assert.Null(ElementById(ProcessAfter(), "EFormidlingTask_Task_1"));
    }
}
