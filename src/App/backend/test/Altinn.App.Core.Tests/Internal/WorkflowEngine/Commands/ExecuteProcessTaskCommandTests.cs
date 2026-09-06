using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands;

/// <summary>
/// The one engine command every process task command runs through: resolves the command by key, hands it the
/// narrow app-facing context, and maps its result to the engine's vocabulary.
/// </summary>
public class ExecuteProcessTaskCommandTests
{
    private static readonly Guid _workflowId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid _stepId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private static ProcessEngineCommandContext CreateContext(
        IInstanceDataMutator mutator,
        ExecuteProcessTaskCommandPayload? payload
    )
    {
        return new ProcessEngineCommandContext
        {
            StateCarry = new(),
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutator,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = ExecuteProcessTaskCommand.Key,
                Actor = new Actor { UserId = 1337 },
                LockToken = Guid.NewGuid().ToString(),
                ExecutionReferenceTime = new DateTimeOffset(2025, 3, 14, 9, 26, 53, TimeSpan.Zero),
                State = "{}",
                WorkflowId = _workflowId,
                StepId = _stepId,
                Payload = CommandPayloadSerializer.Serialize(payload),
            },
        };
    }

    private static IInstanceDataMutator CreateMutator()
    {
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock
            .Setup(x => x.Instance)
            .Returns(
                new Instance
                {
                    Org = "ttd",
                    AppId = "ttd/test-app",
                    Process = new ProcessState
                    {
                        CurrentTask = new ProcessElementInfo { ElementId = "Task_1", AltinnTaskType = "data" },
                    },
                }
            );
        return mutatorMock.Object;
    }

    private static IWorkflowEngineCommand CreateCommand(params IProcessTaskCommand[] commands)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        foreach (IProcessTaskCommand command in commands)
        {
            services.AddSingleton(command);
        }

        ServiceProvider sp = services.BuildServiceProvider();
        return new ExecuteProcessTaskCommand(
            new ProcessTaskCommandExecutor(sp.GetRequiredService<AppImplementationFactory>())
        );
    }

    [Fact]
    public async Task Execute_RunsCommandWithNarrowContext_ReturnsSuccess()
    {
        ProcessTaskCommandContext? seen = null;
        var fake = new FakeCommand(
            "Notify",
            context =>
            {
                seen = context;
                return ProcessTaskCommandResult.Completed();
            }
        );
        IWorkflowEngineCommand command = CreateCommand(fake);
        IInstanceDataMutator mutator = CreateMutator();

        ProcessEngineCommandResult result = await command.Execute(
            CreateContext(mutator, new ExecuteProcessTaskCommandPayload("Notify", "{\"batch\":1}"))
        );

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.NotNull(seen);
        Assert.Same(mutator, seen.InstanceDataMutator);
        Assert.Equal("Task_1", seen.TaskId);
        Assert.Equal("{\"batch\":1}", seen.Payload);
        Assert.Equal(_workflowId, seen.WorkflowId);
        Assert.Equal(_stepId, seen.StepId);
    }

    [Fact]
    public async Task Execute_UnknownKey_ReturnsPermanentFailure()
    {
        IWorkflowEngineCommand command = CreateCommand(
            new FakeCommand("Other", _ => ProcessTaskCommandResult.Completed())
        );

        ProcessEngineCommandResult result = await command.Execute(
            CreateContext(CreateMutator(), new ExecuteProcessTaskCommandPayload("Notify"))
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ProcessTaskCommandNotFound", failed.ExceptionType);
        Assert.Contains("'Notify'", failed.ErrorMessage);
    }

    [Fact]
    public async Task Execute_AmbiguousKey_ReturnsPermanentFailure()
    {
        IWorkflowEngineCommand command = CreateCommand(
            new FakeCommand("Notify", _ => ProcessTaskCommandResult.Completed()),
            new FakeCommand("Notify", _ => ProcessTaskCommandResult.Completed())
        );

        ProcessEngineCommandResult result = await command.Execute(
            CreateContext(CreateMutator(), new ExecuteProcessTaskCommandPayload("Notify"))
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ProcessTaskCommandAmbiguous", failed.ExceptionType);
    }

    [Fact]
    public async Task Execute_MissingKeyInPayload_ReturnsPermanentFailure()
    {
        IWorkflowEngineCommand command = CreateCommand(
            new FakeCommand("Notify", _ => ProcessTaskCommandResult.Completed())
        );

        ProcessEngineCommandResult result = await command.Execute(
            CreateContext(CreateMutator(), new ExecuteProcessTaskCommandPayload(null))
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("InvalidPayloadException", failed.ExceptionType);
    }

    [Fact]
    public async Task Execute_FailedPermanent_MapsToPermanentFailure()
    {
        IWorkflowEngineCommand command = CreateCommand(
            new FakeCommand("Notify", _ => ProcessTaskCommandResult.FailedPermanent("no resource"))
        );

        ProcessEngineCommandResult result = await command.Execute(
            CreateContext(CreateMutator(), new ExecuteProcessTaskCommandPayload("Notify"))
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal(ProcessTaskCommandExecutor.FailedReasonCode, failed.ExceptionType);
        Assert.Equal("Process task command 'Notify' failed: no resource", failed.ErrorMessage);
    }

    [Fact]
    public async Task Execute_FailedRetryable_MapsToRetryableFailure()
    {
        IWorkflowEngineCommand command = CreateCommand(
            new FakeCommand("Notify", _ => ProcessTaskCommandResult.FailedRetryable("timeout"))
        );

        ProcessEngineCommandResult result = await command.Execute(
            CreateContext(CreateMutator(), new ExecuteProcessTaskCommandPayload("Notify"))
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
        Assert.Equal(ProcessTaskCommandExecutor.FailedReasonCode, failed.ExceptionType);
        Assert.Contains("timeout", failed.ErrorMessage);
    }

    [Fact]
    public async Task Execute_CommandThrows_MapsToRetryableFailure()
    {
        IWorkflowEngineCommand command = CreateCommand(
            new FakeCommand("Notify", _ => throw new InvalidOperationException("boom"))
        );

        ProcessEngineCommandResult result = await command.Execute(
            CreateContext(CreateMutator(), new ExecuteProcessTaskCommandPayload("Notify"))
        );

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
        Assert.Equal("boom", failed.ErrorMessage);
        Assert.Equal("InvalidOperationException", failed.ExceptionType);
    }

    private sealed class FakeCommand(string key, Func<ProcessTaskCommandContext, ProcessTaskCommandResult> execute)
        : IProcessTaskCommand
    {
        public string Key => key;

        public Task<ProcessTaskCommandResult> Execute(ProcessTaskCommandContext context) =>
            Task.FromResult(execute(context));
    }
}
