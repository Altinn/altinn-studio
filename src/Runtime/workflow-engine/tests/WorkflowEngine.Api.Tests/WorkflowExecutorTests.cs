using System.Net;
using System.Text.Json;
using WorkflowEngine.Api.Authentication.ApiKey;
using WorkflowEngine.Api.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Extensions;

namespace WorkflowEngine.Api.Tests;

public class WorkflowExecutorTests
{
    // === Command Dispatch Tests ===

    [Fact]
    public async Task Execute_NoopCommand_ReturnsSuccess()
    {
        // Arrange
        using var fixture = WorkflowEngineTestFixture.Create();
        var executor = new WorkflowExecutor(fixture.ServiceProvider);
        var step = WorkflowEngineTestFixture.CreateStep(new Command.Debug.Noop());
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step);

        // Act
        var result = await executor.Execute(workflow, step, CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.Success, result.Status);
    }

    [Fact]
    public async Task Execute_ThrowCommand_ReturnsRetryableError()
    {
        // Arrange
        using var fixture = WorkflowEngineTestFixture.Create();
        var executor = new WorkflowExecutor(fixture.ServiceProvider);
        var step = WorkflowEngineTestFixture.CreateStep(new Command.Debug.Throw());
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step);

        // Act
        var result = await executor.Execute(workflow, step, CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.RetryableError, result.Status);
        Assert.NotNull(result.Exception);
        Assert.IsType<InvalidOperationException>(result.Exception);
    }

    [Fact]
    public async Task Execute_CancellationRequested_ThrowsOperationCanceledException()
    {
        // Arrange
        using var fixture = WorkflowEngineTestFixture.Create();
        var executor = new WorkflowExecutor(fixture.ServiceProvider);
        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();
        var step = WorkflowEngineTestFixture.CreateStep(new Command.Debug.Noop());
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step);

        // Act & Assert
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => executor.Execute(workflow, step, cts.Token));
    }

    // === AppCommand Tests ===

    [Fact]
    public async Task Execute_AppCommand_SuccessResponse_ReturnsSuccess()
    {
        // Arrange
        using var fixture = WorkflowEngineTestFixture.Create();
        var executor = new WorkflowExecutor(fixture.ServiceProvider);
        var command = new Command.AppCommand("test-command");
        var step = WorkflowEngineTestFixture.CreateStep(command);
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step);

        // Act
        var result = await executor.Execute(workflow, step, CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.Success, result.Status);
        Assert.Single(fixture.HttpHandler.Requests);
        Assert.Equal(HttpMethod.Post, fixture.HttpHandler.Requests[0].Method);
    }

    [Fact]
    public async Task Execute_AppCommand_ErrorResponse_ReturnsRetryableError()
    {
        // Arrange
        using var fixture = WorkflowEngineTestFixture.Create();
        fixture.HttpHandler.ResponseStatusCode = HttpStatusCode.InternalServerError;
        fixture.HttpHandler.ResponseContent = "Internal Server Error";
        var executor = new WorkflowExecutor(fixture.ServiceProvider);
        var command = new Command.AppCommand("test-command");
        var step = WorkflowEngineTestFixture.CreateStep(command);
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step);

        // Act
        var result = await executor.Execute(workflow, step, CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.RetryableError, result.Status);
        Assert.Contains("InternalServerError", result.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Execute_AppCommand_SendsCorrectPayload()
    {
        // Arrange
        using var fixture = WorkflowEngineTestFixture.Create();
        var executor = new WorkflowExecutor(fixture.ServiceProvider);
        var command = new Command.AppCommand("test-command", Payload: "test-payload-data");
        var step = WorkflowEngineTestFixture.CreateStep(command);
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step, instanceLockKey: "my-lock-key");

        // Act
        var result = await executor.Execute(workflow, step, CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.Success, result.Status);
        Assert.Single(fixture.HttpHandler.Requests);

        var captured = fixture.HttpHandler.Requests[0];
        Assert.NotNull(captured.Body);

        var payload = JsonSerializer.Deserialize<AppCallbackPayload>(captured.Body);
        Assert.NotNull(payload);
        Assert.Equal("test-command", payload.CommandKey);
        Assert.Equal(step.Actor.UserIdOrOrgNumber, payload.Actor.UserIdOrOrgNumber);
        Assert.Equal("my-lock-key", payload.LockToken);
        Assert.Equal("test-payload-data", payload.Payload);
    }

    [Fact]
    public async Task Execute_AppCommand_MissingInstanceLockKey_ReturnsRetryableError()
    {
        // Arrange
        using var fixture = WorkflowEngineTestFixture.Create();
        var executor = new WorkflowExecutor(fixture.ServiceProvider);
        var command = new Command.AppCommand("test-command");
        var step = WorkflowEngineTestFixture.CreateStep(command);
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step, instanceLockKey: null);

        // Act
        var result = await executor.Execute(workflow, step, CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.RetryableError, result.Status);
        Assert.IsType<InvalidOperationException>(result.Exception);
        Assert.Empty(fixture.HttpHandler.Requests);
    }

    // === Webhook Tests ===

    [Fact]
    public async Task Execute_Webhook_WithPayload_PostsAndReturnsSuccess()
    {
        // Arrange
        using var fixture = WorkflowEngineTestFixture.Create();
        var executor = new WorkflowExecutor(fixture.ServiceProvider);
        var command = new Command.Webhook("https://webhook.example.com/hook", Payload: "webhook-data");
        var step = WorkflowEngineTestFixture.CreateStep(command);
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step);

        // Act
        var result = await executor.Execute(workflow, step, CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.Success, result.Status);
        Assert.Single(fixture.HttpHandler.Requests);

        var captured = fixture.HttpHandler.Requests[0];
        Assert.Equal(HttpMethod.Post, captured.Method);
        Assert.Equal("https://webhook.example.com/hook", captured.RequestUri.ToString());
        Assert.Equal("webhook-data", captured.Body);
    }

    [Fact]
    public async Task Execute_Webhook_WithoutPayload_GetsAndReturnsSuccess()
    {
        // Arrange
        using var fixture = WorkflowEngineTestFixture.Create();
        var executor = new WorkflowExecutor(fixture.ServiceProvider);
        var command = new Command.Webhook("https://webhook.example.com/hook");
        var step = WorkflowEngineTestFixture.CreateStep(command);
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step);

        // Act
        var result = await executor.Execute(workflow, step, CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.Success, result.Status);
        Assert.Single(fixture.HttpHandler.Requests);

        var captured = fixture.HttpHandler.Requests[0];
        Assert.Equal(HttpMethod.Get, captured.Method);
        Assert.Equal("https://webhook.example.com/hook", captured.RequestUri.ToString());
        Assert.Null(captured.Body);
    }

    [Fact]
    public async Task Execute_Webhook_ErrorResponse_ReturnsRetryableError()
    {
        // Arrange
        using var fixture = WorkflowEngineTestFixture.Create();
        fixture.HttpHandler.ResponseStatusCode = HttpStatusCode.BadGateway;
        fixture.HttpHandler.ResponseContent = "Bad Gateway";
        var executor = new WorkflowExecutor(fixture.ServiceProvider);
        var command = new Command.Webhook("https://webhook.example.com/hook");
        var step = WorkflowEngineTestFixture.CreateStep(command);
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step);

        // Act
        var result = await executor.Execute(workflow, step, CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.RetryableError, result.Status);
        Assert.Contains("Webhook execution failed", result.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Execute_Webhook_WithContentType_SetsContentTypeHeader()
    {
        // Arrange
        using var fixture = WorkflowEngineTestFixture.Create();
        var executor = new WorkflowExecutor(fixture.ServiceProvider);
        var command = new Command.Webhook(
            "https://webhook.example.com/hook",
            Payload: "{\"key\":\"value\"}",
            ContentType: "application/json"
        );
        var step = WorkflowEngineTestFixture.CreateStep(command);
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step);

        // Act
        var result = await executor.Execute(workflow, step, CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.Success, result.Status);
        Assert.Single(fixture.HttpHandler.Requests);

        var captured = fixture.HttpHandler.Requests[0];
        Assert.Equal("application/json", captured.ContentType);
    }

    // === Timeout Tests ===

    [Fact]
    public async Task Execute_Timeout_ReturnsSuccess()
    {
        // Arrange
        using var fixture = WorkflowEngineTestFixture.Create();
        var executor = new WorkflowExecutor(fixture.ServiceProvider);
        var command = new Command.Debug.Timeout(TimeSpan.FromMilliseconds(10));
        var step = WorkflowEngineTestFixture.CreateStep(command);
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step);

        // Act
        var result = await executor.Execute(workflow, step, CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.Success, result.Status);
    }

    // === Delegate Tests ===

    [Fact]
    public async Task Execute_Delegate_Success_ReturnsSuccess()
    {
        // Arrange
        using var fixture = WorkflowEngineTestFixture.Create();
        var executor = new WorkflowExecutor(fixture.ServiceProvider);
        var delegateWasCalled = false;
        var command = new Command.Debug.Delegate(
            (_, _, _) =>
            {
                delegateWasCalled = true;
                return Task.CompletedTask;
            }
        );
        var step = WorkflowEngineTestFixture.CreateStep(command);
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step);

        // Act
        var result = await executor.Execute(workflow, step, CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.Success, result.Status);
        Assert.True(delegateWasCalled);
    }

    [Fact]
    public async Task Execute_Delegate_Throws_ReturnsRetryableError()
    {
        // Arrange
        using var fixture = WorkflowEngineTestFixture.Create();
        var executor = new WorkflowExecutor(fixture.ServiceProvider);
        var command = new Command.Debug.Delegate((_, _, _) => throw new InvalidOperationException("Delegate failed"));
        var step = WorkflowEngineTestFixture.CreateStep(command);
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step);

        // Act
        var result = await executor.Execute(workflow, step, CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.RetryableError, result.Status);
        Assert.Contains("Delegate failed", result.Message, StringComparison.Ordinal);
    }

    // === GetAuthorizedAppClient Tests ===

    [Fact]
    public void GetAuthorizedAppClient_SetsApiKeyHeaderAndBaseAddress()
    {
        // Arrange
        using var fixture = WorkflowEngineTestFixture.Create();
        var executor = new WorkflowExecutor(fixture.ServiceProvider);
        var instanceInfo = WorkflowEngineTestFixture.DefaultInstanceInformation;

        // Act
        using var client = executor.GetAuthorizedAppClient(instanceInfo);

        // Assert
        Assert.NotNull(client.BaseAddress);
        Assert.Contains("ttd", client.BaseAddress.ToString(), StringComparison.Ordinal);
        Assert.Contains("test-app", client.BaseAddress.ToString(), StringComparison.Ordinal);

        Assert.True(client.DefaultRequestHeaders.Contains(ApiKeyAuthenticationHandler.HeaderName));
        var apiKeyValues = client.DefaultRequestHeaders.GetValues(ApiKeyAuthenticationHandler.HeaderName).ToList();
        Assert.Single(apiKeyValues);
        Assert.Equal("test-api-key", apiKeyValues[0]);
    }
}
