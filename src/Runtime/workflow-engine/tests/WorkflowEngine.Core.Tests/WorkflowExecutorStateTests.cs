using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using WorkflowEngine.Core.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Abstractions;

namespace WorkflowEngine.Core.Tests;

/// <summary>
/// Tests for <c>WorkflowExecutor.ResolveStateIn</c> — verifying how the executor
/// resolves <see cref="CommandExecutionContext.StateIn"/> from previous steps' StateOut
/// or the workflow's InitialState.
/// </summary>
public class WorkflowExecutorStateTests
{
    /// <summary>
    /// A command that captures the <see cref="CommandExecutionContext"/> for assertion.
    /// </summary>
    private sealed class StateCapturingCommand : ICommand
    {
        public string CommandType => "state-capture";
        public Type? CommandDataType => null;
        public Type? WorkflowContextType => null;

        public string? CapturedStateIn { get; private set; }

        public CommandValidationResult Validate(object? commandData, object? workflowContext) =>
            CommandValidationResult.Accept();

        public Task<ExecutionResult> ExecuteAsync(CommandExecutionContext context, CancellationToken cancellationToken)
        {
            CapturedStateIn = context.StateIn;
            return Task.FromResult(ExecutionResult.Success());
        }
    }

    private static (IWorkflowExecutor Executor, StateCapturingCommand Command) CreateExecutor()
    {
        var command = new StateCapturingCommand();
        using var fixture = WorkflowEngineTestFixture.Create(services =>
        {
            services.AddSingleton<ICommand>(command);
        });

        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        return (executor, command);
    }

    private static Step CreateStep(int order, string? stateOut = null) =>
        new()
        {
            OperationId = $"step-{order}",
            IdempotencyKey = $"key/step-{order}",
            ProcessingOrder = order,
            Command = CommandDefinition.Create("state-capture"),
            StateOut = stateOut,
            Status = stateOut is not null ? PersistentItemStatus.Completed : PersistentItemStatus.Enqueued,
        };

    [Fact]
    public async Task ResolveStateIn_FirstStep_ReturnsWorkflowInitialState()
    {
        var command = new StateCapturingCommand();
        using var fixture = WorkflowEngineTestFixture.Create(services =>
        {
            services.AddSingleton<ICommand>(command);
        });
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();

        var step = CreateStep(0);
        var workflow = new Workflow
        {
            OperationId = "test-op",
            IdempotencyKey = "test-key",
            Namespace = "test-ns",
            Context = JsonSerializer.SerializeToElement(new { }),
            Steps = [step],
            InitialState = "init",
        };

        await executor.Execute(workflow, step, CancellationToken.None);

        Assert.Equal("init", command.CapturedStateIn);
    }

    [Fact]
    public async Task ResolveStateIn_FirstStep_NoInitialState_ReturnsNull()
    {
        var command = new StateCapturingCommand();
        using var fixture = WorkflowEngineTestFixture.Create(services =>
        {
            services.AddSingleton<ICommand>(command);
        });
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();

        var step = CreateStep(0);
        var workflow = new Workflow
        {
            OperationId = "test-op",
            IdempotencyKey = "test-key",
            Namespace = "test-ns",
            Context = JsonSerializer.SerializeToElement(new { }),
            Steps = [step],
            InitialState = null,
        };

        await executor.Execute(workflow, step, CancellationToken.None);

        Assert.Null(command.CapturedStateIn);
    }

    [Fact]
    public async Task ResolveStateIn_SecondStep_ReturnsPreviousStepStateOut()
    {
        var command = new StateCapturingCommand();
        using var fixture = WorkflowEngineTestFixture.Create(services =>
        {
            services.AddSingleton<ICommand>(command);
        });
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();

        var step0 = CreateStep(0, stateOut: "from-step-0");
        var step1 = CreateStep(1);
        var workflow = new Workflow
        {
            OperationId = "test-op",
            IdempotencyKey = "test-key",
            Namespace = "test-ns",
            Context = JsonSerializer.SerializeToElement(new { }),
            Steps = [step0, step1],
        };

        await executor.Execute(workflow, step1, CancellationToken.None);

        Assert.Equal("from-step-0", command.CapturedStateIn);
    }

    [Fact]
    public async Task ResolveStateIn_ThirdStep_SkipsNullStateOut()
    {
        var command = new StateCapturingCommand();
        using var fixture = WorkflowEngineTestFixture.Create(services =>
        {
            services.AddSingleton<ICommand>(command);
        });
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();

        var step0 = CreateStep(0, stateOut: "from-step-0");
        var step1 = CreateStep(1, stateOut: null);
        step1.Status = PersistentItemStatus.Completed; // Completed but with null StateOut
        var step2 = CreateStep(2);
        var workflow = new Workflow
        {
            OperationId = "test-op",
            IdempotencyKey = "test-key",
            Namespace = "test-ns",
            Context = JsonSerializer.SerializeToElement(new { }),
            Steps = [step0, step1, step2],
        };

        await executor.Execute(workflow, step2, CancellationToken.None);

        Assert.Equal("from-step-0", command.CapturedStateIn);
    }

    [Fact]
    public async Task ResolveStateIn_NoPreviousStateOut_ReturnsNull()
    {
        var command = new StateCapturingCommand();
        using var fixture = WorkflowEngineTestFixture.Create(services =>
        {
            services.AddSingleton<ICommand>(command);
        });
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();

        var step0 = CreateStep(0, stateOut: null);
        step0.Status = PersistentItemStatus.Completed;
        var step1 = CreateStep(1);
        var workflow = new Workflow
        {
            OperationId = "test-op",
            IdempotencyKey = "test-key",
            Namespace = "test-ns",
            Context = JsonSerializer.SerializeToElement(new { }),
            Steps = [step0, step1],
        };

        await executor.Execute(workflow, step1, CancellationToken.None);

        Assert.Null(command.CapturedStateIn);
    }
}
