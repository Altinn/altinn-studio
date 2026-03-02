using System.Net;
using System.Text;
using System.Text.Json;
using WorkflowEngine.Api.Authentication.ApiKey;
using WorkflowEngine.Api.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;

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
        Assert.Contains("AppCommand failed with HTTP 500", result.Message, StringComparison.Ordinal);
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
        Assert.Contains("Webhook failed with HTTP 502", result.Message, StringComparison.Ordinal);
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

    // === ClassifyHttpError Tests ===

    [Fact]
    public async Task ClassifyHttpError_ProblemDetailsWithNonRetryable_ReturnsCritical()
    {
        // Arrange
        var response = new HttpResponseMessage(HttpStatusCode.BadRequest)
        {
            Content = new StringContent(
                """{"type":"about:blank","title":"Bad Request","status":400,"nonRetryable":true}""",
                Encoding.UTF8,
                "application/problem+json"
            ),
        };
        var strategy = RetryStrategy.Exponential(TimeSpan.FromSeconds(1));

        // Act
        var result = await WorkflowExecutor.ClassifyHttpError(response, strategy, "AppCommand", CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.CriticalError, result.Status);
        Assert.Equal(400, result.HttpStatusCode);
        Assert.Contains("HTTP 400", result.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ClassifyHttpError_NonRetryableStatusCode_ReturnsCritical()
    {
        // Arrange
        var response = new HttpResponseMessage(HttpStatusCode.NotFound) { Content = new StringContent("Not Found") };
        var strategy = RetryStrategy.Exponential(TimeSpan.FromSeconds(1), nonRetryableHttpStatusCodes: [404]);

        // Act
        var result = await WorkflowExecutor.ClassifyHttpError(response, strategy, "Webhook", CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.CriticalError, result.Status);
        Assert.Equal(404, result.HttpStatusCode);
    }

    [Fact]
    public async Task ClassifyHttpError_DefaultNonRetryableStatusCode_ReturnsCritical()
    {
        // Arrange — strategy without explicit nonRetryableHttpStatusCodes uses defaults
        var response = new HttpResponseMessage(HttpStatusCode.Unauthorized)
        {
            Content = new StringContent("Unauthorized"),
        };
        var strategy = RetryStrategy.Exponential(TimeSpan.FromSeconds(1));

        // Act
        var result = await WorkflowExecutor.ClassifyHttpError(response, strategy, "AppCommand", CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.CriticalError, result.Status);
        Assert.Equal(401, result.HttpStatusCode);
    }

    [Fact]
    public async Task ClassifyHttpError_ServerError_ReturnsRetryable()
    {
        // Arrange
        var response = new HttpResponseMessage(HttpStatusCode.InternalServerError)
        {
            Content = new StringContent("Internal Server Error"),
        };
        var strategy = RetryStrategy.Exponential(TimeSpan.FromSeconds(1));

        // Act
        var result = await WorkflowExecutor.ClassifyHttpError(response, strategy, "AppCommand", CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.RetryableError, result.Status);
        Assert.Equal(500, result.HttpStatusCode);
    }

    [Fact]
    public async Task ClassifyHttpError_AppSignalTakesPrecedenceOverStatusCode()
    {
        // Arrange — 500 is normally retryable, but app signals nonRetryable
        var response = new HttpResponseMessage(HttpStatusCode.InternalServerError)
        {
            Content = new StringContent(
                """{"type":"about:blank","title":"Internal Error","status":500,"nonRetryable":true}""",
                Encoding.UTF8,
                "application/problem+json"
            ),
        };
        var strategy = RetryStrategy.Exponential(TimeSpan.FromSeconds(1));

        // Act
        var result = await WorkflowExecutor.ClassifyHttpError(response, strategy, "Webhook", CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.CriticalError, result.Status);
        Assert.Equal(500, result.HttpStatusCode);
    }

    [Fact]
    public async Task ClassifyHttpError_NonJsonBody_FallsThrough()
    {
        // Arrange
        var response = new HttpResponseMessage(HttpStatusCode.BadGateway)
        {
            Content = new StringContent("Bad Gateway"),
        };
        var strategy = RetryStrategy.Exponential(TimeSpan.FromSeconds(1));

        // Act
        var result = await WorkflowExecutor.ClassifyHttpError(response, strategy, "Webhook", CancellationToken.None);

        // Assert — 502 is not in the default non-retryable list, so it's retryable
        Assert.Equal(ExecutionStatus.RetryableError, result.Status);
        Assert.Equal(502, result.HttpStatusCode);
    }

    [Fact]
    public async Task Execute_AppCommand_NonRetryableStatusCode_ReturnsCriticalError()
    {
        // Arrange
        using var fixture = WorkflowEngineTestFixture.Create(
            engineSettings: new EngineSettings
            {
                QueueCapacity = 10,
                MaxDegreeOfParallelism = 5,
                DefaultStepCommandTimeout = TimeSpan.FromSeconds(30),
                DefaultStepRetryStrategy = RetryStrategy.Exponential(
                    TimeSpan.FromSeconds(1),
                    nonRetryableHttpStatusCodes: [400, 404]
                ),
                DatabaseCommandTimeout = TimeSpan.FromSeconds(10),
                DatabaseRetryStrategy = RetryStrategy.None(),
                MaxConcurrentDbOperations = 5,
                MaxConcurrentHttpCalls = 5,
            }
        );
        fixture.HttpHandler.ResponseStatusCode = HttpStatusCode.NotFound;
        fixture.HttpHandler.ResponseContent = "Not Found";
        var executor = new WorkflowExecutor(fixture.ServiceProvider);
        var command = new Command.AppCommand("test-command");
        var step = WorkflowEngineTestFixture.CreateStep(command);
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step);

        // Act
        var result = await executor.Execute(workflow, step, CancellationToken.None);

        // Assert
        Assert.Equal(ExecutionStatus.CriticalError, result.Status);
        Assert.Equal(404, result.HttpStatusCode);
    }
}
