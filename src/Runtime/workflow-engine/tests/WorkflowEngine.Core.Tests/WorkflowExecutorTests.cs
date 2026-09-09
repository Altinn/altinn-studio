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

    private static Step CaptureStep(int order, string? stateOut = null, TimeSpan? waitBudget = null) =>
        new()
        {
            OperationId = $"capture-{order}",
            ProcessingOrder = order,
            Command = new CommandDefinition { Type = "test-capture", WaitBudget = waitBudget },
            StateOut = stateOut,
        };

    private static Workflow WorkflowWith(params Step[] steps) =>
        new()
        {
            OperationId = "test-operation",
            IdempotencyKey = "test-wf-key",
            Namespace = "test-namespace",
            Steps = [.. steps],
        };

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

    [Fact]
    public async Task Execute_NegativeMaxExecutionTime_ReturnsCriticalError()
    {
        // Arrange - CancelAfter would throw ArgumentOutOfRangeException; the executor must classify
        // the bad value as a critical step error instead of faulting the worker
        using var fixture = WorkflowEngineTestFixture.Create();
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var command = CreateWebhookCommand("https://example.com/hook") with
        {
            MaxExecutionTime = TimeSpan.FromMinutes(-10),
        };
        var step = WorkflowEngineTestFixture.CreateStep(command);
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step);

        // Act
        var result = await executor.Execute(workflow, step, TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal(ExecutionStatus.CriticalError, result.Status);
        Assert.Contains("invalid execution timeout", result.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Execute_MaxExecutionTimeBeyondCancelAfterRange_ReturnsCriticalError()
    {
        // Arrange - CancelAfter accepts at most ~49.7 days
        using var fixture = WorkflowEngineTestFixture.Create();
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var command = CreateWebhookCommand("https://example.com/hook") with
        {
            MaxExecutionTime = TimeSpan.FromDays(60),
        };
        var step = WorkflowEngineTestFixture.CreateStep(command);
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step);

        // Act
        var result = await executor.Execute(workflow, step, TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal(ExecutionStatus.CriticalError, result.Status);
        Assert.Contains("invalid execution timeout", result.Message, StringComparison.Ordinal);
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
    public async Task Execute_StepWithOwnStateOut_ReceivesItAsStateIn()
    {
        // Regression: a deferring step must resume from the state IT produced, not from the previous
        // step's. The engine persists a deferring step's StateOut; before this, StateIn was resolved
        // only from earlier steps, so that state was written and then silently discarded on every
        // re-execution — and the app-side mutator whose contract promises "changes are saved" would
        // have handed the next attempt a stale view.
        var capture = new StateCapturingCommand();
        using var fixture = WorkflowEngineTestFixture.Create(services =>
        {
            services.AddSingleton<ICommand>(capture);
        });
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();

        var previous = CaptureStep(order: 0, stateOut: "state-from-previous-step");
        var current = CaptureStep(order: 1, stateOut: "state-from-my-own-last-attempt");
        var workflow = WorkflowWith(previous, current);

        await executor.Execute(workflow, current, TestContext.Current.CancellationToken);

        Assert.Equal("state-from-my-own-last-attempt", capture.ObservedStateIn);
    }

    [Fact]
    public async Task Execute_StepWithoutOwnStateOut_ReceivesPreviousStepState()
    {
        // The complement: with no state of its own, a step still inherits the pipeline's, so the
        // preference above cannot change behavior for steps that have never deferred.
        var capture = new StateCapturingCommand();
        using var fixture = WorkflowEngineTestFixture.Create(services =>
        {
            services.AddSingleton<ICommand>(capture);
        });
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();

        var previous = CaptureStep(order: 0, stateOut: "state-from-previous-step");
        var current = CaptureStep(order: 1);
        var workflow = WorkflowWith(previous, current);

        await executor.Execute(workflow, current, TestContext.Current.CancellationToken);

        Assert.Equal("state-from-previous-step", capture.ObservedStateIn);
    }

    [Fact]
    public async Task Execute_DeferredStep_ReceivesWaitDeadlineFromItsBudget()
    {
        // The deadline is what lets a polling command pace itself, or give up on its own terms
        // instead of being failed anonymously when the budget expires.
        var capture = new StateCapturingCommand();
        using var fixture = WorkflowEngineTestFixture.Create(services =>
        {
            services.AddSingleton<ICommand>(capture);
        });
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();

        var firstDeferredAt = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);
        var step = CaptureStep(order: 0, waitBudget: TimeSpan.FromHours(6));
        step.FirstDeferredAt = firstDeferredAt;
        var workflow = WorkflowWith(step);

        await executor.Execute(workflow, step, TestContext.Current.CancellationToken);

        Assert.Equal(firstDeferredAt.AddHours(6), capture.ObservedWaitDeadline);
    }

    [Fact]
    public async Task Execute_ReportsExecutionDeadlineMatchingTheStepTimeout()
    {
        // The deadline a command paces itself against must agree with the clock that will actually cut
        // it off, so it is derived from the same timeout the cancellation source counts down to.
        var capture = new StateCapturingCommand();
        using var fixture = WorkflowEngineTestFixture.Create(services =>
        {
            services.AddSingleton<ICommand>(capture);
        });
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();

        var timeout = TimeSpan.FromMinutes(3);
        var step = WorkflowEngineTestFixture.CreateStep(
            new CommandDefinition { Type = "test-capture", MaxExecutionTime = timeout }
        );
        var workflow = WorkflowWith(step);

        var before = DateTimeOffset.UtcNow;
        await executor.Execute(workflow, step, TestContext.Current.CancellationToken);
        var after = DateTimeOffset.UtcNow;

        Assert.NotNull(capture.ObservedExecutionDeadline);
        Assert.InRange(capture.ObservedExecutionDeadline.Value, before.Add(timeout), after.Add(timeout));
    }

    [Fact]
    public async Task Execute_StepThatNeverDeferred_HasNoWaitDeadline()
    {
        var capture = new StateCapturingCommand();
        using var fixture = WorkflowEngineTestFixture.Create(services =>
        {
            services.AddSingleton<ICommand>(capture);
        });
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();

        var step = CaptureStep(order: 0);
        var workflow = WorkflowWith(step);

        await executor.Execute(workflow, step, TestContext.Current.CancellationToken);

        // Nothing is being waited on yet, so there is no deadline to report — the whole budget is ahead.
        Assert.Null(capture.ObservedWaitDeadline);
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

/// <summary>
/// Records the wait-related fields the executor hands to a command, so tests can assert on the
/// context a real command would observe.
/// </summary>
internal sealed class StateCapturingCommand : ICommand
{
    public string CommandType => "test-capture";

    public Type? CommandDataType => null;

    public Type? WorkflowContextType => null;

    public string? ObservedStateIn { get; private set; }

    public DateTimeOffset? ObservedExecutionDeadline { get; private set; }

    public DateTimeOffset? ObservedWaitDeadline { get; private set; }

    public CommandValidationResult Validate(object? commandData, object? workflowContext) =>
        new CommandValidationResult.Valid();

    public Task<ExecutionResult> Execute(CommandExecutionContext context, CancellationToken cancellationToken)
    {
        ObservedStateIn = context.StateIn;
        ObservedExecutionDeadline = context.ExecutionDeadline;
        ObservedWaitDeadline = context.WaitDeadline;
        return Task.FromResult(ExecutionResult.Success());
    }
}
