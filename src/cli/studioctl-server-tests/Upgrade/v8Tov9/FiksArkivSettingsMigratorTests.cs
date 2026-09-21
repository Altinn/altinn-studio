using System.Text.Json;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.FiksArkivSettingsMigration;
using static Studioctl.Tests.Upgrade.v8Tov9.BpmnBuilder;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class FiksArkivSettingsMigratorTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private async Task<MigrationResult> Migrate() => await new FiksArkivSettingsMigrator(_app.Root).Migrate();

    [Fact]
    public async Task PreservesBomAndIsIdempotent()
    {
        var text =
            Settings("      \"MoveToNextTask\": true", "      \"Action\": \"reject\"").Replace("\n", "\r\n") + "\r\n";
        _app.WriteBytes(
            "appsettings.json",
            System.Text.Encoding.UTF8.GetPreamble().Concat(System.Text.Encoding.UTF8.GetBytes(text)).ToArray()
        );
        await Migrate();
        var first = _app.ReadBytes("appsettings.json");
        Assert.True(first.AsSpan().StartsWith(System.Text.Encoding.UTF8.GetPreamble()));
        Assert.EndsWith("\r\n", System.Text.Encoding.UTF8.GetString(first));
        await Migrate();
        Assert.Equal(first, _app.ReadBytes("appsettings.json"));
    }

    /// <summary>A process whose Fiks Arkiv task is followed by a gateway with two ways out, as v9 requires.</summary>
    private static string ProcessWithGateway() =>
        Process(
            StartEvent("StartEvent_1"),
            Task("Task_1", "data"),
            ServiceTask("Task_Fiks", "fiksArkiv"),
            Gateway("Gateway_Fiks"),
            Task("Task_Followup", "data"),
            EndEvent("EndEvent_1"),
            Flow("Flow_1", "StartEvent_1", "Task_1"),
            Flow("Flow_2", "Task_1", "Task_Fiks"),
            Flow("Flow_3", "Task_Fiks", "Gateway_Fiks"),
            Flow("Flow_4", "Gateway_Fiks", "EndEvent_1"),
            ConditionalFlow("Flow_5", "Gateway_Fiks", "Task_Followup", "[\"equals\", [\"gatewayAction\"], \"reject\"]")
        );

    /// <summary>The v8 shape: the Fiks Arkiv task flows straight into the next element.</summary>
    private static string ProcessWithoutGateway() =>
        Process(
            StartEvent("StartEvent_1"),
            ServiceTask("Task_Fiks", "fiksArkiv"),
            EndEvent("EndEvent_1"),
            Flow("Flow_1", "StartEvent_1", "Task_Fiks"),
            Flow("Flow_2", "Task_Fiks", "EndEvent_1")
        );

    private static string Settings(string successHandling, string errorHandling) =>
        $$"""
            {
              "AppSettings": {
                "OpenIdWellKnownEndpoint": "http://localhost:5101/authentication/api/v1/openid/"
              },
              "FiksArkivSettings": {
                "Recipient": {
                  "FiksAccount": { "Value": "c3c87fac-06be-44ed-a11c-aa137d12863c" },
                  "Identifier": { "Value": "0301" },
                  "Name": { "Value": "Oslo kommune" }
                },
                "SuccessHandling": {
            {{successHandling}}
                },
                "ErrorHandling": {
            {{errorHandling}}
                }
              }
            }
            """;

    [Fact]
    public async Task NoAppSettings_NothingToDo()
    {
        var result = await Migrate();

        Assert.Empty(result.Messages);
    }

    [Fact]
    public async Task NoMoveToNextTask_LeavesTheFileUntouched()
    {
        var original = Settings("      \"MarkInstanceComplete\": true", "      \"Action\": \"reject\"");
        _app.Write("appsettings.json", original);
        _app.Write("config/process/process.bpmn", ProcessWithGateway());

        var result = await Migrate();

        Assert.Empty(result.Messages);
        Assert.Equal(original, _app.Read("appsettings.json"));
    }

    [Fact]
    public async Task MoveToNextTaskTrue_IsRemovedAndReportedAsUnchangedBehavior()
    {
        _app.Write(
            "appsettings.json",
            Settings(
                "      \"MoveToNextTask\": true,\n      \"MarkInstanceComplete\": true,\n      \"Action\": \"confirm\"",
                "      \"Action\": \"reject\",\n      \"MoveToNextTask\": true"
            )
        );
        _app.Write("config/process/process.bpmn", ProcessWithGateway());

        var result = await Migrate();

        var rewritten = _app.Read("appsettings.json");
        Assert.DoesNotContain("MoveToNextTask", rewritten, StringComparison.OrdinalIgnoreCase);
        using var doc = JsonDocument.Parse(rewritten); // the trailing comma after "Action": "reject" is gone
        var fiks = doc.RootElement.GetProperty("FiksArkivSettings");
        Assert.True(fiks.GetProperty("SuccessHandling").GetProperty("MarkInstanceComplete").GetBoolean());
        Assert.Equal("confirm", fiks.GetProperty("SuccessHandling").GetProperty("Action").GetString());
        Assert.Equal("reject", fiks.GetProperty("ErrorHandling").GetProperty("Action").GetString());
        Assert.Equal("0301", fiks.GetProperty("Recipient").GetProperty("Identifier").GetProperty("Value").GetString());

        Assert.Empty(result.Todos);
        Assert.Equal(2, result.Warnings.Count);
        Assert.Contains(
            result.Warnings,
            w => w.Contains("SuccessHandling:MoveToNextTask (true)", StringComparison.Ordinal)
        );
        Assert.Contains(
            result.Warnings,
            w => w.Contains("ErrorHandling:MoveToNextTask (true)", StringComparison.Ordinal)
        );
    }

    [Fact]
    public async Task SuccessHandlingFalse_IsRemovedAndFlaggedAsABehaviorChange()
    {
        _app.Write(
            "appsettings.json",
            Settings(
                "      \"MoveToNextTask\": false,\n      \"MarkInstanceComplete\": true",
                "      \"Action\": \"reject\""
            )
        );
        _app.Write("config/process/process.bpmn", ProcessWithGateway());

        var result = await Migrate();

        Assert.DoesNotContain("MoveToNextTask", _app.Read("appsettings.json"), StringComparison.OrdinalIgnoreCase);
        var todo = Assert.Single(result.Todos);
        Assert.Contains("SuccessHandling:MoveToNextTask (false)", todo, StringComparison.Ordinal);
        Assert.Contains("stayed on the Fiks Arkiv task", todo, StringComparison.Ordinal);
        Assert.Empty(result.Warnings);
    }

    [Fact]
    public async Task ErrorHandlingFalse_IsRemovedAndFlaggedWithTheRejectRouting()
    {
        _app.Write("appsettings.json", Settings("      \"Action\": \"confirm\"", "      \"MoveToNextTask\": false"));
        _app.Write("config/process/process.bpmn", ProcessWithGateway());

        var result = await Migrate();

        Assert.DoesNotContain("MoveToNextTask", _app.Read("appsettings.json"), StringComparison.OrdinalIgnoreCase);
        var todo = Assert.Single(result.Todos);
        Assert.Contains("ErrorHandling:MoveToNextTask (false)", todo, StringComparison.Ordinal);
        Assert.Contains("gatewayAction", todo, StringComparison.Ordinal);
        Assert.Contains("'reject' right", todo, StringComparison.Ordinal);
    }

    [Fact]
    public async Task EnvironmentSpecificFiles_AreMigratedToo()
    {
        _app.Write(
            "appsettings.json",
            Settings("      \"MarkInstanceComplete\": true", "      \"Action\": \"reject\"")
        );
        _app.Write(
            "appsettings.Production.json",
            """
            {
              "FiksArkivSettings": {
                "ErrorHandling": {
                  "MoveToNextTask": true
                }
              }
            }
            """
        );
        _app.Write("config/process/process.bpmn", ProcessWithGateway());

        var result = await Migrate();

        Assert.DoesNotContain(
            "MoveToNextTask",
            _app.Read("appsettings.Production.json"),
            StringComparison.OrdinalIgnoreCase
        );
        using var doc = JsonDocument.Parse(_app.Read("appsettings.Production.json"));
        Assert.Equal(
            JsonValueKind.Object,
            doc.RootElement.GetProperty("FiksArkivSettings").GetProperty("ErrorHandling").ValueKind
        );
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("appsettings.Production.json", warning, StringComparison.Ordinal);
    }

    [Fact]
    public async Task CamelCaseKeys_AreRecognized()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "fiksArkivSettings": {
                "successHandling": {
                  "moveToNextTask": false
                }
              }
            }
            """
        );

        var result = await Migrate();

        Assert.DoesNotContain("moveToNextTask", _app.Read("appsettings.json"), StringComparison.OrdinalIgnoreCase);
        var todo = Assert.Single(result.Todos);
        Assert.Contains("successHandling:MoveToNextTask (false)", todo, StringComparison.Ordinal);
    }

    [Fact]
    public async Task SameNamedSettingOutsideTheHandlers_IsLeftAlone()
    {
        var original = """
            {
              "SomethingElse": {
                "MoveToNextTask": true
              },
              "FiksArkivSettings": {
                "Recipient": {
                  "Nested": {
                    "MoveToNextTask": false
                  }
                }
              }
            }
            """;
        _app.Write("appsettings.json", original);

        var result = await Migrate();

        Assert.Equal(original, _app.Read("appsettings.json"));
        Assert.Empty(result.Messages);
    }

    [Fact]
    public async Task InlineFormatting_IsLeftInPlaceWithATodo()
    {
        var original = """
            {
              "FiksArkivSettings": {
                "ErrorHandling": { "MoveToNextTask": true, "Action": "reject" }
              }
            }
            """;
        _app.Write("appsettings.json", original);

        var result = await Migrate();

        Assert.Equal(original, _app.Read("appsettings.json"));
        var todo = Assert.Single(result.Todos);
        Assert.Contains("unexpected formatting", todo, StringComparison.Ordinal);
        Assert.Contains("line 3", todo, StringComparison.Ordinal);
    }

    [Fact]
    public async Task FiksArkivTaskWithoutAGateway_GetsATodo()
    {
        _app.Write("config/process/process.bpmn", ProcessWithoutGateway());

        var result = await Migrate();

        var todo = Assert.Single(result.Todos);
        Assert.Contains("'Task_Fiks' is not followed by an exclusive gateway", todo, StringComparison.Ordinal);
        Assert.Contains("gatewayAction", todo, StringComparison.Ordinal);
    }

    [Fact]
    public async Task GatewayWithASingleExit_GetsATodo()
    {
        // A gateway is there, but with one way out it cannot separate a confirmed archiving from a rejected one.
        _app.Write(
            "config/process/process.bpmn",
            Process(
                StartEvent("StartEvent_1"),
                ServiceTask("Task_Fiks", "fiksArkiv"),
                Gateway("Gateway_Fiks"),
                EndEvent("EndEvent_1"),
                Flow("Flow_1", "StartEvent_1", "Task_Fiks"),
                Flow("Flow_2", "Task_Fiks", "Gateway_Fiks"),
                Flow("Flow_3", "Gateway_Fiks", "EndEvent_1")
            )
        );

        var result = await Migrate();

        var todo = Assert.Single(result.Todos);
        Assert.Contains(
            "'Gateway_Fiks' after the Fiks Arkiv task 'Task_Fiks' has fewer than two",
            todo,
            StringComparison.Ordinal
        );
        Assert.Contains("gatewayAction", todo, StringComparison.Ordinal);
    }

    [Fact]
    public async Task FiksArkivTaskFollowedByAGateway_IsClean()
    {
        _app.Write("config/process/process.bpmn", ProcessWithGateway());

        var result = await Migrate();

        Assert.Empty(result.Messages);
    }

    [Fact]
    public async Task OtherServiceTasksWithoutAGateway_AreNobodysBusinessHere()
    {
        _app.Write(
            "config/process/process.bpmn",
            Process(
                ServiceTask("Task_Send", "eFormidling"),
                EndEvent("EndEvent_1"),
                Flow("Flow_1", "Task_Send", "EndEvent_1")
            )
        );

        var result = await Migrate();

        Assert.Empty(result.Messages);
    }
}
