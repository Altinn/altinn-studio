using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using WorkflowEngine.App.Commands.AppCommand;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;

namespace WorkflowEngine.App.Tests.Commands.AppCommand;

/// <summary>
/// Tests for <see cref="App.Commands.AppCommand.AppCommand.Validate"/>
/// via the <see cref="ICommand"/> interface.
/// </summary>
public class AppCommandValidationTests
{
    private static readonly ICommand Command = CreateCommand();

    private static AppWorkflowContext ValidContext =>
        new()
        {
            Actor = new Actor { UserIdOrOrgNumber = "test-user-123" },
            LockToken = "test-lock-key",
            Org = "ttd",
            App = "test-app",
            InstanceOwnerPartyId = 12345,
            InstanceGuid = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
        };

    private static AppCommandData ValidData => new() { CommandKey = "do-something" };

    [Fact]
    public void Validate_ValidDataAndContext_Accepts()
    {
        var result = Command.Validate(ValidData, ValidContext);

        Assert.IsType<CommandValidationResult.Valid>(result);
    }

    [Fact]
    public void Validate_NullCommandData_Rejects()
    {
        var result = Command.Validate(null, ValidContext);

        var invalid = Assert.IsType<CommandValidationResult.Invalid>(result);
        Assert.Contains("commandKey", invalid.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_EmptyOrWhitespaceCommandKey_Rejects(string? commandKey)
    {
        var data = new AppCommandData { CommandKey = commandKey! };

        var result = Command.Validate(data, ValidContext);

        Assert.IsType<CommandValidationResult.Invalid>(result);
    }

    [Fact]
    public void Validate_NullWorkflowContext_Rejects()
    {
        var result = Command.Validate(ValidData, null);

        var invalid = Assert.IsType<CommandValidationResult.Invalid>(result);
        Assert.Contains("workflow context", invalid.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Validate_NullActor_Rejects()
    {
        var context = ValidContext with { Actor = null! };

        var result = Command.Validate(ValidData, context);

        var invalid = Assert.IsType<CommandValidationResult.Invalid>(result);
        Assert.Contains("actor", invalid.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_EmptyActorUserIdOrOrgNumber_Rejects(string? userIdOrOrgNumber)
    {
        var context = ValidContext with { Actor = new Actor { UserIdOrOrgNumber = userIdOrOrgNumber! } };

        var result = Command.Validate(ValidData, context);

        Assert.IsType<CommandValidationResult.Invalid>(result);
    }

    [Theory]
    [InlineData(null, "test-app")]
    [InlineData("", "test-app")]
    [InlineData("   ", "test-app")]
    [InlineData("ttd", null)]
    [InlineData("ttd", "")]
    [InlineData("ttd", "   ")]
    public void Validate_MissingOrgOrApp_Rejects(string? org, string? app)
    {
        var context = ValidContext with { Org = org!, App = app! };

        var result = Command.Validate(ValidData, context);

        var invalid = Assert.IsType<CommandValidationResult.Invalid>(result);
        Assert.Contains("org", invalid.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-999)]
    public void Validate_InvalidInstanceOwnerPartyId_Rejects(int partyId)
    {
        var context = ValidContext with { InstanceOwnerPartyId = partyId };

        var result = Command.Validate(ValidData, context);

        var invalid = Assert.IsType<CommandValidationResult.Invalid>(result);
        Assert.Contains("instanceOwnerPartyId", invalid.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Validate_EmptyInstanceGuid_Rejects()
    {
        var context = ValidContext with { InstanceGuid = Guid.Empty };

        var result = Command.Validate(ValidData, context);

        var invalid = Assert.IsType<CommandValidationResult.Invalid>(result);
        Assert.Contains("instanceGuid", invalid.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_MissingLockToken_Rejects(string? lockToken)
    {
        var context = ValidContext with { LockToken = lockToken! };

        var result = Command.Validate(ValidData, context);

        var invalid = Assert.IsType<CommandValidationResult.Invalid>(result);
        Assert.Contains("lockToken", invalid.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Validate_WithOptionalPayload_Accepts()
    {
        var data = new AppCommandData { CommandKey = "do-something", Payload = "some-payload" };

        var result = Command.Validate(data, ValidContext);

        Assert.IsType<CommandValidationResult.Valid>(result);
    }

    private static App.Commands.AppCommand.AppCommand CreateCommand()
    {
        var settings = Options.Create(
            new AppCommandSettings
            {
                ApiKey = "test-key",
                CommandEndpoint = "https://example.com/{Org}/{App}/callbacks",
            }
        );
        var httpFactory = new Mock<IHttpClientFactory>();
        var limiter = new Mock<IConcurrencyLimiter>();
        var logger = NullLogger<App.Commands.AppCommand.AppCommand>.Instance;

        return new App.Commands.AppCommand.AppCommand(settings, httpFactory.Object, limiter.Object, logger);
    }
}
