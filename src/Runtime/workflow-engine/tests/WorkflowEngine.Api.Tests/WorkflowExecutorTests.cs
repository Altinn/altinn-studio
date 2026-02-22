using System.Net;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using WorkflowEngine.Api.Authentication.ApiKey;
using WorkflowEngine.Api.Tests.Fixtures;
using WorkflowEngine.Data.Repository;
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

    // === AppCommand Request-Reply Tests ===

    [Fact]
    public async Task Execute_AppCommand_202Response_ReturnsSuccess()
    {
        // Arrange — with the new design, AppCommand treats 202 as success
        // (the ReplyAppCommand step handles waiting for the reply)
        using var fixture = WorkflowEngineTestFixture.Create();
        fixture.HttpHandler.ResponseStatusCode = HttpStatusCode.Accepted;
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
    public async Task Execute_AppCommand_SendsPayloadWithCorrelationId()
    {
        // Arrange
        var correlationId = Guid.NewGuid();
        using var fixture = WorkflowEngineTestFixture.Create();
        var executor = new WorkflowExecutor(fixture.ServiceProvider);
        var command = new Command.AppCommand("test-command", Payload: "test-payload");
        var step = WorkflowEngineTestFixture.CreateStep(command) with { CorrelationId = correlationId };
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
        Assert.Equal("my-lock-key", payload.LockToken);
        Assert.Equal("test-payload", payload.Payload);
        Assert.Equal(correlationId, payload.CorrelationId);
    }

    [Fact]
    public async Task Execute_AppCommand_RequestFails_ReturnsRetryableError()
    {
        // Arrange
        using var fixture = WorkflowEngineTestFixture.Create();
        fixture.HttpHandler.ResponseStatusCode = HttpStatusCode.InternalServerError;
        fixture.HttpHandler.ResponseContent = "Server Error";
        var executor = new WorkflowExecutor(fixture.ServiceProvider);
        var command = new Command.AppCommand("test-command");
        var step = WorkflowEngineTestFixture.CreateStep(command);
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step);

        // Act
        var result = await executor.Execute(workflow, step, CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.RetryableError, result.Status);
        Assert.Contains("AppCommand execution failed", result.Message, StringComparison.Ordinal);
    }

    // === ReplyAppCommand Tests ===

    [Fact]
    public async Task Execute_ReplyAppCommand_WithReply_ReturnsSuccess()
    {
        // Arrange
        var correlationId = Guid.NewGuid();
        var replyId = Guid.NewGuid();
        var reply = new Reply
        {
            DatabaseId = 1,
            ReplyId = replyId,
            StepId = 42,
            Payload = "{\"response\":\"data\"}",
            CreatedAt = DateTimeOffset.UtcNow,
        };

        var mockRepository = new Mock<IEngineRepository>();
        mockRepository
            .Setup(r => r.GetReplyByCorrelationId(correlationId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(reply);

        using var fixture = WorkflowEngineTestFixture.Create(configureServices: services =>
        {
            services.AddScoped<IEngineRepository>(_ => mockRepository.Object);
        });
        var executor = new WorkflowExecutor(fixture.ServiceProvider);
        var command = new Command.ReplyAppCommand("test-command", Payload: "original-payload");
        var step = WorkflowEngineTestFixture.CreateStep(command) with { CorrelationId = correlationId };
        step.DatabaseId = 42;
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step);

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
        Assert.Equal("original-payload", payload.Payload);
        Assert.Equal("{\"response\":\"data\"}", payload.Reply);
    }

    [Fact]
    public async Task Execute_ReplyAppCommand_WithReply_CallbackFails_ReturnsRetryableError()
    {
        // Arrange
        var correlationId = Guid.NewGuid();
        var reply = new Reply
        {
            DatabaseId = 1,
            ReplyId = Guid.NewGuid(),
            StepId = 42,
            Payload = "{}",
            CreatedAt = DateTimeOffset.UtcNow,
        };

        var mockRepository = new Mock<IEngineRepository>();
        mockRepository
            .Setup(r => r.GetReplyByCorrelationId(correlationId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(reply);

        using var fixture = WorkflowEngineTestFixture.Create(configureServices: services =>
        {
            services.AddScoped<IEngineRepository>(_ => mockRepository.Object);
        });
        fixture.HttpHandler.ResponseStatusCode = HttpStatusCode.BadGateway;
        fixture.HttpHandler.ResponseContent = "Bad Gateway";
        var executor = new WorkflowExecutor(fixture.ServiceProvider);
        var command = new Command.ReplyAppCommand("test-command");
        var step = WorkflowEngineTestFixture.CreateStep(command) with { CorrelationId = correlationId };
        step.DatabaseId = 42;
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step);

        // Act
        var result = await executor.Execute(workflow, step, CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.RetryableError, result.Status);
        Assert.Contains("AppCommand execution failed", result.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Execute_ReplyAppCommand_NoReply_ReturnsSuspended()
    {
        // Arrange — no reply has been received yet
        var correlationId = Guid.NewGuid();
        var mockRepository = new Mock<IEngineRepository>();
        mockRepository
            .Setup(r => r.GetReplyByCorrelationId(correlationId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Reply?)null);

        using var fixture = WorkflowEngineTestFixture.Create(configureServices: services =>
        {
            services.AddScoped<IEngineRepository>(_ => mockRepository.Object);
        });
        var executor = new WorkflowExecutor(fixture.ServiceProvider);
        var command = new Command.ReplyAppCommand("test-command");
        var step = WorkflowEngineTestFixture.CreateStep(command) with { CorrelationId = correlationId };
        step.DatabaseId = 42;
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step);

        // Act
        var result = await executor.Execute(workflow, step, CancellationToken.None);

        // Assert — should return Suspended without making any HTTP call
        Assert.Equal(ExecutionStatus.Suspended, result.Status);
        Assert.Empty(fixture.HttpHandler.Requests);
    }

    [Fact]
    public async Task Execute_ReplyAppCommand_MissingCorrelationId_ReturnsRetryableError()
    {
        // Arrange — ReplyAppCommand without a CorrelationId
        using var fixture = WorkflowEngineTestFixture.Create();
        var executor = new WorkflowExecutor(fixture.ServiceProvider);
        var command = new Command.ReplyAppCommand("test-command");
        var step = WorkflowEngineTestFixture.CreateStep(command); // no CorrelationId set
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step);

        // Act
        var result = await executor.Execute(workflow, step, CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.RetryableError, result.Status);
        Assert.Contains("CorrelationId", result.Message, StringComparison.Ordinal);
        Assert.Empty(fixture.HttpHandler.Requests);
    }

    [Fact]
    public async Task Execute_ReplyAppCommand_MissingInstanceLockKey_ReturnsRetryableError()
    {
        // Arrange
        var correlationId = Guid.NewGuid();
        var reply = new Reply
        {
            DatabaseId = 1,
            ReplyId = Guid.NewGuid(),
            StepId = 42,
            Payload = "{}",
            CreatedAt = DateTimeOffset.UtcNow,
        };

        var mockRepository = new Mock<IEngineRepository>();
        mockRepository
            .Setup(r => r.GetReplyByCorrelationId(correlationId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(reply);

        using var fixture = WorkflowEngineTestFixture.Create(configureServices: services =>
        {
            services.AddScoped<IEngineRepository>(_ => mockRepository.Object);
        });
        var executor = new WorkflowExecutor(fixture.ServiceProvider);
        var command = new Command.ReplyAppCommand("test-command");
        var step = WorkflowEngineTestFixture.CreateStep(command) with { CorrelationId = correlationId };
        step.DatabaseId = 42;
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step, instanceLockKey: null);

        // Act
        var result = await executor.Execute(workflow, step, CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.RetryableError, result.Status);
        Assert.IsType<InvalidOperationException>(result.Exception);
        Assert.Empty(fixture.HttpHandler.Requests);
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
