using System.Net;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using WorkflowEngine.App.Commands.AppCommand;
using WorkflowEngine.App.Tests.Fixtures;
using WorkflowEngine.Core;
using WorkflowEngine.Models;

namespace WorkflowEngine.App.Tests.Commands.AppCommand;

/// <summary>
/// Unit tests for <see cref="App.Commands.AppCommand.AppCommand.ExecuteAsync"/>
/// via <see cref="IWorkflowExecutor"/>, backed by a mocked HTTP handler.
/// </summary>
public class AppCommandExecutionTests
{
    private static CommandDefinition CreateAppCommand(string commandKey, string? payload = null) =>
        App.Commands.AppCommand.AppCommand.Create(new AppCommandData { CommandKey = commandKey, Payload = payload });

    [Fact]
    public async Task Execute_SuccessResponse_ReturnsSuccess()
    {
        using var fixture = AppCommandTestFixture.Create();
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var command = CreateAppCommand("test-command");
        var step = AppCommandTestFixture.CreateStep(command);
        var workflow = AppCommandTestFixture.CreateWorkflow(step);

        var result = await executor.Execute(workflow, step, CancellationToken.None);

        Assert.Equal(ExecutionStatus.Success, result.Status);
        Assert.Single(fixture.HttpHandler.Requests);
        Assert.Equal(HttpMethod.Post, fixture.HttpHandler.Requests[0].Method);
    }

    [Fact]
    public async Task Execute_SendsCorrectPayload()
    {
        using var fixture = AppCommandTestFixture.Create();
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var command = CreateAppCommand("test-command", payload: "test-payload-data");
        var step = AppCommandTestFixture.CreateStep(command);
        var workflow = AppCommandTestFixture.CreateWorkflow(step);

        var result = await executor.Execute(workflow, step, CancellationToken.None);

        Assert.Equal(ExecutionStatus.Success, result.Status);
        Assert.Single(fixture.HttpHandler.Requests);

        var captured = fixture.HttpHandler.Requests[0];
        Assert.NotNull(captured.Body);

        var payload = JsonSerializer.Deserialize<AppCallbackPayload>(captured.Body);
        Assert.NotNull(payload);
        Assert.Equal("test-command", payload.CommandKey);
        Assert.Equal("test-user-123", payload.Actor.UserIdOrOrgNumber);
        Assert.Equal("test-lock-key", payload.LockToken);
        Assert.Equal("test-payload-data", payload.Payload);
    }

    [Fact]
    public async Task Execute_SetsApiKeyHeader()
    {
        using var fixture = AppCommandTestFixture.Create();
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var command = CreateAppCommand("test-command");
        var step = AppCommandTestFixture.CreateStep(command);
        var workflow = AppCommandTestFixture.CreateWorkflow(step);

        await executor.Execute(workflow, step, CancellationToken.None);

        var captured = fixture.HttpHandler.Requests[0];
        Assert.True(captured.Headers.ContainsKey("X-Api-Key"));
        Assert.Contains("test-api-key", captured.Headers["X-Api-Key"]);
    }

    [Fact]
    public async Task Execute_UsesCommandKeyAsRelativeUri()
    {
        using var fixture = AppCommandTestFixture.Create();
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var command = CreateAppCommand("my-callback-path");
        var step = AppCommandTestFixture.CreateStep(command);
        var workflow = AppCommandTestFixture.CreateWorkflow(step);

        await executor.Execute(workflow, step, CancellationToken.None);

        var captured = fixture.HttpHandler.Requests[0];
        Assert.Contains("my-callback-path", captured.RequestUri.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Execute_ExpandsEndpointUrlTemplate()
    {
        using var fixture = AppCommandTestFixture.Create();
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var command = CreateAppCommand("test-command");
        var step = AppCommandTestFixture.CreateStep(command);
        var workflow = AppCommandTestFixture.CreateWorkflow(step);

        await executor.Execute(workflow, step, CancellationToken.None);

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
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var command = CreateAppCommand("test-command");
        var step = AppCommandTestFixture.CreateStep(command);
        var workflow = AppCommandTestFixture.CreateWorkflow(step);

        var result = await executor.Execute(workflow, step, CancellationToken.None);

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
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var command = CreateAppCommand("test-command");
        var step = AppCommandTestFixture.CreateStep(command);
        var workflow = AppCommandTestFixture.CreateWorkflow(step);

        var result = await executor.Execute(workflow, step, CancellationToken.None);

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
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var command = CreateAppCommand("test-command");
        var step = AppCommandTestFixture.CreateStep(command);
        var workflow = AppCommandTestFixture.CreateWorkflow(step);

        var result = await executor.Execute(workflow, step, CancellationToken.None);

        Assert.Equal(ExecutionStatus.CriticalError, result.Status);
        Assert.Contains("client error", result.Message, StringComparison.OrdinalIgnoreCase);
    }

    // --- StateOut handling ---

    [Fact]
    public async Task Execute_SuccessWithStateInResponse_SetsStateOut()
    {
        using var fixture = AppCommandTestFixture.Create();
        fixture.HttpHandler.ResponseContent = """{"state": "next-step-state"}""";
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var command = CreateAppCommand("test-command");
        var step = AppCommandTestFixture.CreateStep(command);
        var workflow = AppCommandTestFixture.CreateWorkflow(step);

        await executor.Execute(workflow, step, CancellationToken.None);

        Assert.Equal("next-step-state", step.StateOut);
    }

    [Fact]
    public async Task Execute_SuccessWithEmptyBody_DoesNotSetStateOut()
    {
        using var fixture = AppCommandTestFixture.Create();
        fixture.HttpHandler.ResponseContent = "";
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var command = CreateAppCommand("test-command");
        var step = AppCommandTestFixture.CreateStep(command);
        var workflow = AppCommandTestFixture.CreateWorkflow(step);

        await executor.Execute(workflow, step, CancellationToken.None);

        Assert.Null(step.StateOut);
    }

    [Fact]
    public async Task Execute_SuccessWithNullStateInResponse_DoesNotSetStateOut()
    {
        using var fixture = AppCommandTestFixture.Create();
        fixture.HttpHandler.ResponseContent = """{"state": null}""";
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var command = CreateAppCommand("test-command");
        var step = AppCommandTestFixture.CreateStep(command);
        var workflow = AppCommandTestFixture.CreateWorkflow(step);

        await executor.Execute(workflow, step, CancellationToken.None);

        Assert.Null(step.StateOut);
    }

    [Fact]
    public async Task Execute_SuccessWithInvalidJson_ReturnsCriticalError()
    {
        using var fixture = AppCommandTestFixture.Create();
        fixture.HttpHandler.ResponseContent = "not-json{{{";
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var command = CreateAppCommand("test-command");
        var step = AppCommandTestFixture.CreateStep(command);
        var workflow = AppCommandTestFixture.CreateWorkflow(step);

        var result = await executor.Execute(workflow, step, CancellationToken.None);

        Assert.Equal(ExecutionStatus.CriticalError, result.Status);
        Assert.Contains("invalid response body", result.Message, StringComparison.OrdinalIgnoreCase);
    }

    // --- Validation through executor ---

    [Fact]
    public async Task Execute_MissingLockToken_ReturnsCriticalError()
    {
        using var fixture = AppCommandTestFixture.Create();
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var command = CreateAppCommand("test-command");
        var step = AppCommandTestFixture.CreateStep(command);

        var contextWithoutLock = JsonSerializer.SerializeToElement(
            new
            {
                Actor = new Actor { UserIdOrOrgNumber = "test-user-123" },
                Org = "ttd",
                App = "test-app",
                InstanceOwnerPartyId = 12345,
                InstanceGuid = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            }
        );
        var workflow = new Workflow
        {
            OperationId = "test-operation",
            IdempotencyKey = "test-wf-key",
            Namespace = "test-namespace",
            Context = contextWithoutLock,
            Steps = [step],
        };

        var result = await executor.Execute(workflow, step, CancellationToken.None);

        Assert.Equal(ExecutionStatus.CriticalError, result.Status);
        Assert.Empty(fixture.HttpHandler.Requests);
    }
}
