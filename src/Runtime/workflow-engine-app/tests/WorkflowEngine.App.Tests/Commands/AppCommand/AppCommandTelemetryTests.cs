using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using WorkflowEngine.App.Commands.AppCommand;
using WorkflowEngine.Models.Abstractions;
using WorkflowEngine.Resilience;

namespace WorkflowEngine.App.Tests.Commands.AppCommand;

/// <summary>
/// Tests what <see cref="App.Commands.AppCommand.AppCommand"/> tells the engine about the instance a step works
/// on, through the <see cref="ICommand"/> interface the engine calls.
/// </summary>
public class AppCommandTelemetryTests
{
    private static readonly ICommand Command = CreateCommand();

    private static AppWorkflowContext Context =>
        new()
        {
            Actor = new Actor { OrgId = "test-user-123" },
            Org = "ttd",
            App = "test-app",
            InstanceOwnerPartyId = 12345,
            InstanceGuid = Guid.Parse("AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE"),
            CallbackToken = "test-callback-token",
        };

    [Fact]
    public void GetTelemetryAttributes_NamesServiceOwnerAppAndInstanceInTheSharedVocabulary()
    {
        // Act
        var attributes = Command.GetTelemetryAttributes(new AppCommandData { CommandKey = "do-something" }, Context);

        // Assert — the instance GUID in lowercase D format; not the party ID, not the actor
        KeyValuePair<string, object?>[] expected =
        [
            new("altinn.service_owner", "ttd"),
            new("altinn.app", "test-app"),
            new("altinn.instance.guid", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
        ];
        Assert.Equal(expected, attributes);
    }

    [Fact]
    public void GetTelemetryAttributes_NoContext_ReturnsNone()
    {
        var attributes = Command.GetTelemetryAttributes(new AppCommandData { CommandKey = "do-something" }, null);

        Assert.Empty(attributes);
    }

    private static App.Commands.AppCommand.AppCommand CreateCommand()
    {
        var settings = Options.Create(
            new AppCommandSettings { CommandEndpoint = "https://example.com/{Org}/{App}/callbacks" }
        );
        var httpFactory = new Mock<IHttpClientFactory>();
        var limiter = new Mock<IConcurrencyLimiter>();
        var logger = NullLogger<App.Commands.AppCommand.AppCommand>.Instance;

        return new App.Commands.AppCommand.AppCommand(settings, httpFactory.Object, limiter.Object, logger);
    }
}
