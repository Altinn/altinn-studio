using System.Net;
using System.Text.Json;
using WorkflowEngine.App.Commands.AppCommand;
using WorkflowEngine.App.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Abstractions;

namespace WorkflowEngine.App.Tests.Commands.AppCommand;

/// <summary>
/// Unit tests for <see cref="App.Commands.AppCommand.AppCommand.Execute"/>
/// called directly via <see cref="ICommand"/>, backed by a mocked HTTP handler.
/// </summary>
public class AppCommandExecutionTests
{
    private static AppCommandData CreateCommandData(string commandKey, string? payload = null) =>
        new() { CommandKey = commandKey, Payload = payload };

    private static CommandDefinition CreateCommand(string commandKey, string? payload = null) =>
        App.Commands.AppCommand.AppCommand.Create(CreateCommandData(commandKey, payload));

    [Fact]
    public async Task Execute_SuccessResponse_ReturnsSuccess()
    {
        using var fixture = AppCommandTestFixture.Create();
        var command = GetAppCommand(fixture);
        var data = CreateCommandData("test-command");
        var step = AppCommandTestFixture.CreateStep(CreateCommand("test-command"));
        var workflow = AppCommandTestFixture.CreateWorkflow(step);
        var context = AppCommandTestFixture.CreateExecutionContext(workflow, step, data);

        var result = await command.Execute(context, TestContext.Current.CancellationToken);

        Assert.Equal(ExecutionStatus.Success, result.Status);
        Assert.Single(fixture.HttpHandler.Requests);
        Assert.Equal(HttpMethod.Post, fixture.HttpHandler.Requests[0].Method);
    }

    [Fact]
    public async Task Execute_SendsCorrectPayload()
    {
        using var fixture = AppCommandTestFixture.Create();
        var command = GetAppCommand(fixture);
        var data = CreateCommandData("test-command", payload: "test-payload-data");
        var step = AppCommandTestFixture.CreateStep(CreateCommand("test-command", "test-payload-data"));
        var workflow = AppCommandTestFixture.CreateWorkflow(step);
        var context = AppCommandTestFixture.CreateExecutionContext(workflow, step, data);

        var result = await command.Execute(context, TestContext.Current.CancellationToken);

        Assert.Equal(ExecutionStatus.Success, result.Status);
        Assert.Single(fixture.HttpHandler.Requests);

        var captured = fixture.HttpHandler.Requests[0];
        Assert.NotNull(captured.Body);

        var payload = JsonSerializer.Deserialize<AppCallbackPayload>(captured.Body);
        Assert.NotNull(payload);
        Assert.Equal("test-command", payload.CommandKey);
        Assert.Equal("test-user-123", payload.Actor.OrgId);
        Assert.Equal("test-lock-key", payload.LockToken);
        Assert.Equal("test-payload-data", payload.Payload);
    }

    [Fact]
    public async Task Execute_ReplaysCallbackTokenAsBearerHeader()
    {
        using var fixture = AppCommandTestFixture.Create();
        var command = GetAppCommand(fixture);
        var data = CreateCommandData("test-command");
        var step = AppCommandTestFixture.CreateStep(CreateCommand("test-command"));
        var workflow = AppCommandTestFixture.CreateWorkflow(step);
        var context = AppCommandTestFixture.CreateExecutionContext(workflow, step, data);

        var result = await command.Execute(context, TestContext.Current.CancellationToken);

        Assert.Equal(ExecutionStatus.Success, result.Status);
        var captured = fixture.HttpHandler.Requests[0];
        Assert.True(captured.Headers.TryGetValue("Authorization", out var authValues));
        Assert.Equal("Bearer test-callback-token", Assert.Single(authValues));
    }

    [Fact]
    public async Task Execute_PreservesFullActorIdentity_AcrossContextRoundTrip()
    {
        // Regression guard for the "preserve actor identity across handoff" path.
        // The engine must round-trip ALL actor identity fields, not just a single identity + language.
        // App.Core relies on the full actor (ProcessEngine.CreatePlatformUser) to attribute instance
        // events to the originating user/system user when an auto-advanced workflow is re-enqueued.
        using var fixture = AppCommandTestFixture.Create();
        var command = GetAppCommand(fixture);

        var richActor = new Actor
        {
            UserId = 1337,
            OrgId = "ttd",
            AuthenticationLevel = 3,
            NationalIdentityNumber = "01017012345",
            SystemUserId = Guid.Parse("11111111-2222-3333-4444-555555555555"),
            SystemUserOwnerOrgNo = "310702641",
            SystemUserName = "Test system user",
            Language = "nb",
        };

        // Simulate the real handoff: App.Core serializes the context, the engine stores it as an
        // opaque JsonElement and deserializes it back into its own typed AppWorkflowContext.
        var contextElement = JsonSerializer.SerializeToElement(
            new AppWorkflowContext
            {
                Actor = richActor,
                LockToken = "test-lock-key",
                Org = "ttd",
                App = "test-app",
                InstanceOwnerPartyId = 12345,
                InstanceGuid = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
                CallbackToken = "test-callback-token",
            }
        );
        var roundTrippedContext = contextElement.Deserialize<AppWorkflowContext>();
        Assert.NotNull(roundTrippedContext);

        var data = CreateCommandData("test-command");
        var step = AppCommandTestFixture.CreateStep(CreateCommand("test-command"));
        var workflow = AppCommandTestFixture.CreateWorkflow(step);
        var context = AppCommandTestFixture.CreateExecutionContext(
            workflow,
            step,
            data,
            workflowContext: roundTrippedContext
        );

        var result = await command.Execute(context, TestContext.Current.CancellationToken);

        Assert.Equal(ExecutionStatus.Success, result.Status);
        var captured = fixture.HttpHandler.Requests[0];
        var payload = JsonSerializer.Deserialize<AppCallbackPayload>(captured.Body!);

        Assert.NotNull(payload);
        Assert.NotNull(payload.Actor);
        Assert.Equal(1337, payload.Actor.UserId);
        Assert.Equal("ttd", payload.Actor.OrgId);
        Assert.Equal(3, payload.Actor.AuthenticationLevel);
        Assert.Equal("01017012345", payload.Actor.NationalIdentityNumber);
        Assert.Equal(Guid.Parse("11111111-2222-3333-4444-555555555555"), payload.Actor.SystemUserId);
        Assert.Equal("310702641", payload.Actor.SystemUserOwnerOrgNo);
        Assert.Equal("Test system user", payload.Actor.SystemUserName);
        Assert.Equal("nb", payload.Actor.Language);
    }

    [Fact]
    public async Task Execute_UsesCommandKeyAsRelativeUri()
    {
        using var fixture = AppCommandTestFixture.Create();
        var command = GetAppCommand(fixture);
        var data = CreateCommandData("my-callback-path");
        var step = AppCommandTestFixture.CreateStep(CreateCommand("my-callback-path"));
        var workflow = AppCommandTestFixture.CreateWorkflow(step);
        var context = AppCommandTestFixture.CreateExecutionContext(workflow, step, data);

        await command.Execute(context, TestContext.Current.CancellationToken);

        var captured = fixture.HttpHandler.Requests[0];
        Assert.Contains("my-callback-path", captured.RequestUri.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Execute_ExpandsEndpointUrlTemplate()
    {
        using var fixture = AppCommandTestFixture.Create();
        var command = GetAppCommand(fixture);
        var data = CreateCommandData("test-command");
        var step = AppCommandTestFixture.CreateStep(CreateCommand("test-command"));
        var workflow = AppCommandTestFixture.CreateWorkflow(step);
        var context = AppCommandTestFixture.CreateExecutionContext(workflow, step, data);

        await command.Execute(context, TestContext.Current.CancellationToken);

        var captured = fixture.HttpHandler.Requests[0];
        var url = captured.RequestUri.ToString();
        // The template {Org}/{App} should be replaced with context values
        Assert.Contains("ttd", url, StringComparison.Ordinal);
        Assert.Contains("test-app", url, StringComparison.Ordinal);
        Assert.DoesNotContain("{Org}", url, StringComparison.Ordinal);
        Assert.DoesNotContain("{App}", url, StringComparison.Ordinal);
    }

    // --- Error handling: retryable vs non-retryable ---

    [Fact]
    public async Task Execute_500_ReturnsRetryableError()
    {
        using var fixture = AppCommandTestFixture.Create();
        fixture.HttpHandler.ResponseStatusCode = HttpStatusCode.InternalServerError;
        fixture.HttpHandler.ResponseContent = "Internal Server Error";
        var command = GetAppCommand(fixture);
        var data = CreateCommandData("test-command");
        var step = AppCommandTestFixture.CreateStep(CreateCommand("test-command"));
        var workflow = AppCommandTestFixture.CreateWorkflow(step);
        var context = AppCommandTestFixture.CreateExecutionContext(workflow, step, data);

        var result = await command.Execute(context, TestContext.Current.CancellationToken);

        Assert.Equal(ExecutionStatus.RetryableError, result.Status);
        Assert.Contains("InternalServerError", result.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(HttpStatusCode.ServiceUnavailable)]
    [InlineData(HttpStatusCode.GatewayTimeout)]
    [InlineData(HttpStatusCode.RequestTimeout)] // 408 — retryable despite being 4xx
    [InlineData((HttpStatusCode)418)] // 418 — retryable despite being 4xx
    [InlineData((HttpStatusCode)429)] // 429 Too Many Requests — retryable despite being 4xx
    public async Task Execute_RetryableStatusCodes_ReturnsRetryableError(HttpStatusCode statusCode)
    {
        using var fixture = AppCommandTestFixture.Create();
        fixture.HttpHandler.ResponseStatusCode = statusCode;
        fixture.HttpHandler.ResponseContent = "Error";
        var command = GetAppCommand(fixture);
        var data = CreateCommandData("test-command");
        var step = AppCommandTestFixture.CreateStep(CreateCommand("test-command"));
        var workflow = AppCommandTestFixture.CreateWorkflow(step);
        var context = AppCommandTestFixture.CreateExecutionContext(workflow, step, data);

        var result = await command.Execute(context, TestContext.Current.CancellationToken);

        Assert.Equal(ExecutionStatus.RetryableError, result.Status);
    }

    [Theory]
    [InlineData(HttpStatusCode.BadRequest)]
    [InlineData(HttpStatusCode.Unauthorized)]
    [InlineData(HttpStatusCode.Forbidden)]
    [InlineData(HttpStatusCode.NotFound)]
    [InlineData(HttpStatusCode.MethodNotAllowed)]
    [InlineData(HttpStatusCode.Conflict)]
    [InlineData((HttpStatusCode)422)] // Unprocessable Entity
    public async Task Execute_NonRetryable4xx_ReturnsCriticalError(HttpStatusCode statusCode)
    {
        using var fixture = AppCommandTestFixture.Create();
        fixture.HttpHandler.ResponseStatusCode = statusCode;
        fixture.HttpHandler.ResponseContent = "Client error";
        var command = GetAppCommand(fixture);
        var data = CreateCommandData("test-command");
        var step = AppCommandTestFixture.CreateStep(CreateCommand("test-command"));
        var workflow = AppCommandTestFixture.CreateWorkflow(step);
        var context = AppCommandTestFixture.CreateExecutionContext(workflow, step, data);

        var result = await command.Execute(context, TestContext.Current.CancellationToken);

        Assert.Equal(ExecutionStatus.CriticalError, result.Status);
        Assert.Contains("client error", result.Message, StringComparison.OrdinalIgnoreCase);
    }

    // --- StateOut handling ---

    [Fact]
    public async Task Execute_SuccessWithStateInResponse_SetsStateOut()
    {
        using var fixture = AppCommandTestFixture.Create();
        fixture.HttpHandler.ResponseContent = """{"state": "next-step-state"}""";
        var command = GetAppCommand(fixture);
        var data = CreateCommandData("test-command");
        var step = AppCommandTestFixture.CreateStep(CreateCommand("test-command"));
        var workflow = AppCommandTestFixture.CreateWorkflow(step);
        var context = AppCommandTestFixture.CreateExecutionContext(workflow, step, data);

        await command.Execute(context, TestContext.Current.CancellationToken);

        Assert.Equal("next-step-state", step.StateOut);
    }

    [Fact]
    public async Task Execute_SuccessWithEmptyBody_DoesNotSetStateOut()
    {
        using var fixture = AppCommandTestFixture.Create();
        fixture.HttpHandler.ResponseContent = "";
        var command = GetAppCommand(fixture);
        var data = CreateCommandData("test-command");
        var step = AppCommandTestFixture.CreateStep(CreateCommand("test-command"));
        var workflow = AppCommandTestFixture.CreateWorkflow(step);
        var context = AppCommandTestFixture.CreateExecutionContext(workflow, step, data);

        await command.Execute(context, TestContext.Current.CancellationToken);

        Assert.Null(step.StateOut);
    }

    [Fact]
    public async Task Execute_SuccessWithNullStateInResponse_DoesNotSetStateOut()
    {
        using var fixture = AppCommandTestFixture.Create();
        fixture.HttpHandler.ResponseContent = """{"state": null}""";
        var command = GetAppCommand(fixture);
        var data = CreateCommandData("test-command");
        var step = AppCommandTestFixture.CreateStep(CreateCommand("test-command"));
        var workflow = AppCommandTestFixture.CreateWorkflow(step);
        var context = AppCommandTestFixture.CreateExecutionContext(workflow, step, data);

        await command.Execute(context, TestContext.Current.CancellationToken);

        Assert.Null(step.StateOut);
    }

    [Fact]
    public async Task Execute_SuccessWithInvalidJson_ReturnsCriticalError()
    {
        using var fixture = AppCommandTestFixture.Create();
        fixture.HttpHandler.ResponseContent = "not-json{{{";
        var command = GetAppCommand(fixture);
        var data = CreateCommandData("test-command");
        var step = AppCommandTestFixture.CreateStep(CreateCommand("test-command"));
        var workflow = AppCommandTestFixture.CreateWorkflow(step);
        var context = AppCommandTestFixture.CreateExecutionContext(workflow, step, data);

        var result = await command.Execute(context, TestContext.Current.CancellationToken);

        Assert.Equal(ExecutionStatus.CriticalError, result.Status);
        Assert.Contains("invalid response body", result.Message, StringComparison.OrdinalIgnoreCase);
    }

    // --- StateIn / payload completeness ---

    [Fact]
    public async Task Execute_IncludesStateInPayload()
    {
        using var fixture = AppCommandTestFixture.Create();
        var command = GetAppCommand(fixture);
        var data = CreateCommandData("test-command");
        var step = AppCommandTestFixture.CreateStep(CreateCommand("test-command"));
        var workflow = AppCommandTestFixture.CreateWorkflow(step);
        var context = AppCommandTestFixture.CreateExecutionContext(workflow, step, data, stateIn: "previous-state");

        var result = await command.Execute(context, TestContext.Current.CancellationToken);

        Assert.Equal(ExecutionStatus.Success, result.Status);
        Assert.Single(fixture.HttpHandler.Requests);

        var captured = fixture.HttpHandler.Requests[0];
        Assert.NotNull(captured.Body);

        var payload = JsonSerializer.Deserialize<AppCallbackPayload>(captured.Body);
        Assert.NotNull(payload);
        Assert.Equal("previous-state", payload.State);
    }

    [Fact]
    public async Task Execute_SendsCorrectPayload_IncludesWorkflowIdAndState()
    {
        using var fixture = AppCommandTestFixture.Create();
        var command = GetAppCommand(fixture);
        var data = CreateCommandData("test-command", payload: "test-payload-data");
        var step = AppCommandTestFixture.CreateStep(CreateCommand("test-command", "test-payload-data"));
        var workflow = AppCommandTestFixture.CreateWorkflow(step);
        var context = AppCommandTestFixture.CreateExecutionContext(workflow, step, data);

        var result = await command.Execute(context, TestContext.Current.CancellationToken);

        Assert.Equal(ExecutionStatus.Success, result.Status);
        var captured = fixture.HttpHandler.Requests[0];
        var payload = JsonSerializer.Deserialize<AppCallbackPayload>(captured.Body!);

        Assert.NotNull(payload);
        Assert.Equal(workflow.DatabaseId, payload.WorkflowId);
        Assert.Null(payload.State); // First step with no StateIn → null
    }

    // --- Validation through command ---

    [Fact]
    public async Task Execute_MissingLockToken_ReturnsCriticalError()
    {
        using var fixture = AppCommandTestFixture.Create();
        var command = GetAppCommand(fixture);
        var data = CreateCommandData("test-command");

        var contextWithoutLock = new AppWorkflowContext
        {
            Actor = new Actor { OrgId = "test-user-123" },
            LockToken = "", // empty lock token
            Org = "ttd",
            App = "test-app",
            InstanceOwnerPartyId = 12345,
            InstanceGuid = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            CallbackToken = "test-callback-token",
        };
        // Validate should catch the missing lock token before execution
        var validationResult = command.Validate(data, contextWithoutLock);
        Assert.IsType<CommandValidationResult.Invalid>(validationResult);
        Assert.Empty(fixture.HttpHandler.Requests);
    }

    private static ICommand GetAppCommand(AppCommandTestFixture fixture) => fixture.GetAppCommand();
}
