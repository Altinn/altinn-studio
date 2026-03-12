using Microsoft.Extensions.DependencyInjection;
using WorkflowEngine.Commands.Webhook;
using WorkflowEngine.Core.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Abstractions;

namespace WorkflowEngine.Core.Tests;

public class WorkflowExecutorTests
{
    private static CommandDefinition CreateWebhookCommand(
        string uri,
        string? payload = null,
        string? contentType = null
    ) =>
        WebhookCommand.Create(
            new WebhookCommandData
            {
                Uri = uri,
                Payload = payload,
                ContentType = contentType,
            }
        );

    // === Command Dispatch Tests ===

    [Fact]
    public async Task Execute_CancellationRequested_ThrowsOperationCanceledException()
    {
        // Arrange
        using var fixture = WorkflowEngineTestFixture.Create();
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();
        var step = WorkflowEngineTestFixture.CreateStep(CreateWebhookCommand("https://example.com/cancel-test"));
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step);

        // Act & Assert
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => executor.Execute(workflow, step, cts.Token));
    }

    // === Webhook Tests ===

    [Fact]
    public async Task Execute_Webhook_WithPayload_PostsAndReturnsSuccess()
    {
        // Arrange
        using var fixture = WorkflowEngineTestFixture.Create();
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var command = CreateWebhookCommand("https://webhook.example.com/hook", payload: "webhook-data");
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
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var command = CreateWebhookCommand("https://webhook.example.com/hook");
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
        fixture.HttpHandler.ResponseStatusCode = System.Net.HttpStatusCode.BadGateway;
        fixture.HttpHandler.ResponseContent = "Bad Gateway";
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var command = CreateWebhookCommand("https://webhook.example.com/hook");
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
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var command = CreateWebhookCommand(
            "https://webhook.example.com/hook",
            payload: "{\"key\":\"value\"}",
            contentType: "application/json"
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

    // === Delegate Tests ===

    [Fact]
    public async Task Execute_Delegate_Success_ReturnsSuccess()
    {
        // Arrange
        var delegateHandler = new TestDelegateCommand();
        var delegateWasCalled = false;
        delegateHandler.SetAction(
            (_, _, _) =>
            {
                delegateWasCalled = true;
                return Task.CompletedTask;
            }
        );

        using var fixture = WorkflowEngineTestFixture.Create(services =>
        {
            services.AddSingleton<ICommand>(delegateHandler);
        });
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var command = new CommandDefinition { Type = "test-delegate" };
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
        var delegateHandler = new TestDelegateCommand();
        delegateHandler.SetAction((_, _, _) => throw new InvalidOperationException("Delegate failed"));

        using var fixture = WorkflowEngineTestFixture.Create(services =>
        {
            services.AddSingleton<ICommand>(delegateHandler);
        });
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var command = new CommandDefinition { Type = "test-delegate" };
        var step = WorkflowEngineTestFixture.CreateStep(command);
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step);

        // Act
        var result = await executor.Execute(workflow, step, CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.RetryableError, result.Status);
        Assert.Contains("Delegate failed", result.Message, StringComparison.Ordinal);
    }
}
