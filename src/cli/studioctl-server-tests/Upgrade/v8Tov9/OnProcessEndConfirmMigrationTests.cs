using System.Text;
using System.Text.Json;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using static Studioctl.Tests.Upgrade.v8Tov9.BpmnBuilder;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class OnProcessEndConfirmMigrationTests : IDisposable
{
    private const string MetadataPath = "config/applicationmetadata.json";
    private const string ProcessPath = "config/process/process.bpmn";

    private const string MetadataWithoutOnProcessEnd = """
        {
          "id": "ttd/app",
          "org": "ttd",
          "dataTypes": []
        }
        """;

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private async Task<MigrationResult> Migrate() => await OnProcessEndConfirmMigration.Migrate(_app.Root);

    public static TheoryData<string, string, string> ConfirmedInV8 =>
        new()
        {
            { "eFormidling service task", Process(ServiceTask("Task_Send", "eFormidling")), "" },
            { "eFormidling as a plain task", Process(Task("Task_Send", "eFormidling")), "" },
            {
                "eFormidling disabled only locally",
                Process(EFormidlingTask("""<altinn:disabled env="local">true</altinn:disabled>""")),
                ""
            },
            {
                "eFormidling disabled except in production",
                Process(
                    EFormidlingTask(
                        """<altinn:disabled>true</altinn:disabled><altinn:disabled env="production">false</altinn:disabled>"""
                    )
                ),
                ""
            },
            {
                "Fiks Arkiv with MarkInstanceComplete on",
                Process(ServiceTask("Task_Fiks", "fiksArkiv")),
                """{ "FiksArkivSettings": { "SuccessHandling": { "MarkInstanceComplete": true } } }"""
            },
            {
                "Fiks Arkiv with MarkInstanceComplete on as a string, in camel case",
                Process(ServiceTask("Task_Fiks", "fiksArkiv")),
                """{ "fiksArkivSettings": { "successHandling": { "markInstanceComplete": "true" } } }"""
            },
            {
                "Fiks Arkiv settings in a section of the app's own name",
                Process(ServiceTask("Task_Fiks", "fiksArkiv")),
                """{ "MyApp-FiksArkivSettings": { "SuccessHandling": { "MarkInstanceComplete": true } } }"""
            },
        };

    [Theory]
    [MemberData(nameof(ConfirmedInV8))]
    public async Task SetsConfirmWhenATaskConfirmedInV8(string because, string process, string appSettings)
    {
        _app.Write(MetadataPath, MetadataWithoutOnProcessEnd);
        _app.Write(ProcessPath, process);
        if (appSettings.Length > 0)
            _app.Write("appsettings.json", appSettings);

        var result = await Migrate();

        using var doc = JsonDocument.Parse(_app.Read(MetadataPath));
        Assert.True(doc.RootElement.GetProperty("onProcessEnd").GetProperty("confirm").GetBoolean(), because);
        Assert.Contains("Set onProcessEnd.confirm", Assert.Single(result.Messages).Text, StringComparison.Ordinal);
    }

    public static TheoryData<string, string, string> NotConfirmedInV8 =>
        new()
        {
            { "no eFormidling or Fiks Arkiv task", Process(Task("Task_1", "data")), "" },
            {
                "Fiks Arkiv without MarkInstanceComplete, off by default in v8",
                Process(ServiceTask("Task_Fiks", "fiksArkiv")),
                """{ "FiksArkivSettings": { "SuccessHandling": { "MoveToNextTask": true } } }"""
            },
            {
                "Fiks Arkiv with MarkInstanceComplete off",
                Process(ServiceTask("Task_Fiks", "fiksArkiv")),
                """{ "FiksArkivSettings": { "SuccessHandling": { "MarkInstanceComplete": false } } }"""
            },
            {
                "MarkInstanceComplete on without a Fiks Arkiv task",
                Process(Task("Task_1", "data")),
                """{ "FiksArkivSettings": { "SuccessHandling": { "MarkInstanceComplete": true } } }"""
            },
        };

    [Theory]
    [MemberData(nameof(NotConfirmedInV8))]
    public async Task LeavesTheMetadataAloneWhenNothingConfirmedInV8(string because, string process, string appSettings)
    {
        _app.Write(MetadataPath, MetadataWithoutOnProcessEnd);
        _app.Write(ProcessPath, process);
        if (appSettings.Length > 0)
            _app.Write("appsettings.json", appSettings);

        var result = await Migrate();

        Assert.Equal(MetadataWithoutOnProcessEnd, _app.Read(MetadataPath));
        Assert.True(result.Messages.Count == 0, because);
    }

    [Fact]
    public async Task EFormidlingDisabledEverywhere_IsNotConfirmedAndSaysWhatToDoWhenEnabled()
    {
        _app.Write(MetadataPath, MetadataWithoutOnProcessEnd);
        _app.Write(ProcessPath, Process(EFormidlingTask("<altinn:disabled>true</altinn:disabled>")));

        var result = await Migrate();

        Assert.Equal(MetadataWithoutOnProcessEnd, _app.Read(MetadataPath));
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("'Task_Send' are disabled in every environment", warning, StringComparison.Ordinal);
        Assert.Single(result.Messages);
    }

    [Fact]
    public async Task MarkInstanceCompleteOffInAnEnvironment_StillConfirmsAndWarns()
    {
        _app.Write(MetadataPath, MetadataWithoutOnProcessEnd);
        _app.Write(ProcessPath, Process(ServiceTask("Task_Fiks", "fiksArkiv")));
        _app.Write(
            "appsettings.json",
            """{ "FiksArkivSettings": { "SuccessHandling": { "MarkInstanceComplete": true } } }"""
        );
        _app.Write(
            "appsettings.Staging.json",
            """{ "FiksArkivSettings": { "SuccessHandling": { "MarkInstanceComplete": false } } }"""
        );

        var result = await Migrate();

        Assert.Contains("\"onProcessEnd\"", _app.Read(MetadataPath), StringComparison.Ordinal);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("off in appsettings.Staging.json", warning, StringComparison.Ordinal);
    }

    [Fact]
    public async Task AddsThePropertyLastKeepingIndentationLineEndingsAndBom()
    {
        var original =
            "{\r\n    \"id\": \"ttd/app\",\r\n    \"dataTypes\": [\r\n        { \"id\": \"model\" }\r\n    ]\r\n}\r\n";
        _app.WriteBytes(MetadataPath, [.. Encoding.UTF8.GetPreamble(), .. Encoding.UTF8.GetBytes(original)]);
        _app.Write(ProcessPath, Process(ServiceTask("Task_Send", "eFormidling")));

        await Migrate();

        var expected =
            "{\r\n    \"id\": \"ttd/app\",\r\n    \"dataTypes\": [\r\n        { \"id\": \"model\" }\r\n    ],\r\n"
            + "    \"onProcessEnd\": { \"confirm\": true }\r\n}\r\n";
        Assert.Equal(
            [.. Encoding.UTF8.GetPreamble(), .. Encoding.UTF8.GetBytes(expected)],
            _app.ReadBytes(MetadataPath)
        );
    }

    [Theory]
    [InlineData(
        """{ "id": "ttd/app", "onProcessEnd": {} }""",
        """{ "id": "ttd/app", "onProcessEnd": { "confirm": true } }"""
    )]
    [InlineData(
        "{\n  \"id\": \"ttd/app\",\n  \"onProcessEnd\": {\n    \"delete\": false\n  }\n}",
        "{\n  \"id\": \"ttd/app\",\n  \"onProcessEnd\": {\n    \"delete\": false,\n    \"confirm\": true\n  }\n}"
    )]
    public async Task AddsConfirmToAnOnProcessEndWithoutIt(string original, string expected)
    {
        _app.Write(MetadataPath, original);
        _app.Write(ProcessPath, Process(ServiceTask("Task_Send", "eFormidling")));

        await Migrate();

        Assert.Equal(expected, _app.Read(MetadataPath));
    }

    [Theory]
    [InlineData("""{ "id": "ttd/app", "onProcessEnd": { "confirm": true } }""")]
    [InlineData("""{ "id": "ttd/app", "OnProcessEnd": { "Confirm": true } }""")]
    public async Task LeavesAConfirmingOnProcessEndAlone(string original)
    {
        _app.Write(MetadataPath, original);
        _app.Write(ProcessPath, Process(ServiceTask("Task_Send", "eFormidling")));

        var result = await Migrate();

        Assert.Equal(original, _app.Read(MetadataPath));
        Assert.Contains(
            "already sets onProcessEnd.confirm",
            Assert.Single(result.Messages).Text,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task OnARerun_AFiksArkivTaskWithoutMarkInstanceComplete_ReportsTheExistingConfirm()
    {
        // The first run's Fiks Arkiv step removed MarkInstanceComplete, the only sign that the task confirmed in v8.
        const string original = """{ "id": "ttd/app", "onProcessEnd": { "confirm": true } }""";
        _app.Write(MetadataPath, original);
        _app.Write(ProcessPath, Process(ServiceTask("Task_Fiks", "fiksArkiv")));

        var result = await Migrate();

        Assert.Equal(original, _app.Read(MetadataPath));
        Assert.Contains(
            "already sets onProcessEnd.confirm",
            Assert.Single(result.Messages).Text,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task ConfirmFalse_IsKeptWithAWarning()
    {
        var original = """{ "id": "ttd/app", "onProcessEnd": { "confirm": false } }""";
        _app.Write(MetadataPath, original);
        _app.Write(ProcessPath, Process(ServiceTask("Task_Send", "eFormidling")));

        var result = await Migrate();

        Assert.Equal(original, _app.Read(MetadataPath));
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("sets onProcessEnd.confirm to false", warning, StringComparison.Ordinal);
        Assert.Contains("'Task_Send'", warning, StringComparison.Ordinal);
        Assert.Single(result.Messages);
    }

    [Theory]
    [InlineData("""{ "id": "ttd/app", "onProcessEnd": null }""", "not an object")]
    [InlineData("""{ "id": "ttd/app" """, "Could not read")]
    public async Task LeavesTheFileWithATodoWhenItCannotBeEdited(string original, string reason)
    {
        _app.Write(MetadataPath, original);
        _app.Write(ProcessPath, Process(ServiceTask("Task_Send", "eFormidling")));

        var result = await Migrate();

        Assert.Equal(original, _app.Read(MetadataPath));
        Assert.Contains(reason, Assert.Single(result.Todos), StringComparison.Ordinal);
        Assert.Single(result.Messages);
    }

    private static string EFormidlingTask(string disabled) =>
        $"""
                <bpmn:serviceTask id="Task_Send" name="Task_Send">
                  <bpmn:extensionElements>
                    <altinn:taskExtension>
                      <altinn:taskType>eFormidling</altinn:taskType>
                      <altinn:eFormidlingConfig>
                        {disabled}
                        <altinn:receiver>910075918</altinn:receiver>
                      </altinn:eFormidlingConfig>
                    </altinn:taskExtension>
                  </bpmn:extensionElements>
                </bpmn:serviceTask>
            """;
}
