using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands;

/// <summary>
/// The staged (multi-step) dispatch of <see cref="ExecuteServiceTask"/>: step resolution by name,
/// input deserialization from the baton, per-shape result mapping, and the version-skew guards.
/// The single-step dispatch is covered by <see cref="ExecuteServiceTaskTests"/>.
/// </summary>
public class ExecuteStagedServiceTaskTests
{
    private sealed record CaseRef(string CaseId);

    private sealed record CaseWithDocs(string CaseId, int DocCount);

    /// <summary>
    /// A three-step pipeline (entry → link → final) whose behavior each test scripts via delegates.
    /// The steps are nested classes, so the default step names are "CreateCase", "UploadDocs" and
    /// "Finalize" — dispatching on those names is itself part of what these tests prove.
    /// </summary>
    private sealed class ArchiveTask : IStagedServiceTask
    {
        public string Type => "archive";

        public Func<ServiceTaskContext, Task<ServiceTaskStepResult<CaseRef>>> OnCreateCase { get; init; } =
            _ => Task.FromResult(ServiceTaskStepResult.Next(new CaseRef("case-1")));

        public Func<
            ServiceTaskContext<CaseRef>,
            Task<ServiceTaskStepResult<CaseWithDocs>>
        > OnUploadDocs { get; init; } =
            ctx => Task.FromResult(ServiceTaskStepResult.Next(new CaseWithDocs(ctx.Input.CaseId, 2)));

        public Func<ServiceTaskContext<CaseWithDocs>, Task<ServiceTaskResult>> OnFinalize { get; init; } =
            _ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

        public IEnumerable<IServiceTaskStep> Steps => [new CreateCase(this), new UploadDocs(this), new Finalize(this)];

        private sealed class CreateCase(ArchiveTask owner) : IServiceTaskStep<CaseRef>
        {
            public Task<ServiceTaskStepResult<CaseRef>> Execute(ServiceTaskContext context) =>
                owner.OnCreateCase(context);
        }

        private sealed class UploadDocs(ArchiveTask owner) : IServiceTaskStep<CaseRef, CaseWithDocs>
        {
            public Task<ServiceTaskStepResult<CaseWithDocs>> Execute(ServiceTaskContext<CaseRef> context) =>
                owner.OnUploadDocs(context);
        }

        private sealed class Finalize(ArchiveTask owner) : IFinalServiceTaskStep<CaseWithDocs>
        {
            public Task<ServiceTaskResult> Execute(ServiceTaskContext<CaseWithDocs> context) =>
                owner.OnFinalize(context);
        }
    }

    private static ExecuteServiceTask CreateCommand(IServiceTaskBase serviceTask)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        switch (serviceTask)
        {
            case IStagedServiceTask staged:
                services.AddSingleton(staged);
                break;
            case IServiceTask simple:
                services.AddSingleton(simple);
                break;
        }
        var sp = services.BuildServiceProvider();

        return new ExecuteServiceTask(sp.GetRequiredService<AppImplementationFactory>());
    }

    private static ProcessEngineCommandContext CreateContext(object? baton = null)
    {
        var instance = new Instance
        {
            Id = "1337/2b3e9260-24d9-4c0a-8b93-ef2c9c7dcbde",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock.Setup(x => x.Instance).Returns(instance);

        return new ProcessEngineCommandContext
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutatorMock.Object,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = ExecuteServiceTask.Key,
                Actor = new Actor { UserId = 1337 },
                LockToken = Guid.NewGuid().ToString(),
                State = "{}",
                WorkflowId = Guid.NewGuid(),
                StepId = Guid.NewGuid(),
            },
            ServiceTaskBaton = baton is null ? null : JsonSerializer.SerializeToElement(baton),
        };
    }

    private static ExecuteServiceTaskPayload Payload(string? stepName) => new("archive", stepName);

    [Fact]
    public async Task EntryStep_Next_ReturnsSuccessWithoutAdvance_AndSerializedBaton()
    {
        var task = new ArchiveTask();
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(), Payload("CreateCase"));

        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);
        Assert.NotNull(success.ServiceTaskBaton);
        var baton = success.ServiceTaskBaton.Value.Deserialize<CaseRef>();
        Assert.Equal("case-1", baton!.CaseId);
    }

    [Fact]
    public async Task LinkStep_ReceivesTypedInputFromBaton_AndHandsItsOutputOn()
    {
        CaseRef? observedInput = null;
        var task = new ArchiveTask
        {
            OnUploadDocs = ctx =>
            {
                observedInput = ctx.Input;
                return Task.FromResult(ServiceTaskStepResult.Next(new CaseWithDocs(ctx.Input.CaseId, 7)));
            },
        };
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(baton: new CaseRef("case-42")), Payload("UploadDocs"));

        Assert.NotNull(observedInput);
        Assert.Equal("case-42", observedInput.CaseId);
        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        var baton = success.ServiceTaskBaton!.Value.Deserialize<CaseWithDocs>();
        Assert.Equal(new CaseWithDocs("case-42", 7), baton);
    }

    [Fact]
    public async Task FinalStep_Success_AutoAdvances_AndClearsBaton()
    {
        var task = new ArchiveTask();
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(baton: new CaseWithDocs("case-1", 2)), Payload("Finalize"));

        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.True(success.AutoAdvanceProcess);
        Assert.Null(success.AutoAdvanceAction);
        Assert.Null(success.ServiceTaskBaton);
    }

    [Fact]
    public async Task FinalStep_SuccessWithAction_CarriesTheAction()
    {
        var task = new ArchiveTask
        {
            OnFinalize = _ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success("reject")),
        };
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(baton: new CaseWithDocs("case-1", 2)), Payload("Finalize"));

        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.True(success.AutoAdvanceProcess);
        Assert.Equal("reject", success.AutoAdvanceAction);
    }

    [Fact]
    public async Task FinalStep_SuccessWithoutAutoAdvance_DoesNotAdvance()
    {
        var task = new ArchiveTask
        {
            OnFinalize = _ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.SuccessWithoutAutoAdvance()),
        };
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(baton: new CaseWithDocs("case-1", 2)), Payload("Finalize"));

        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);
    }

    [Fact]
    public async Task FinalStep_Defer_ReturnsDeferredResult()
    {
        // The final step is where a polling pipeline waits: it defers with its input preserved
        // (baton carry-over is the controller's job and covered there — here the mapping matters).
        var task = new ArchiveTask
        {
            OnFinalize = _ =>
                Task.FromResult<ServiceTaskResult>(
                    ServiceTaskResult.Defer(TimeSpan.FromMinutes(5), "awaiting receipt")
                ),
        };
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(baton: new CaseWithDocs("case-1", 2)), Payload("Finalize"));

        var deferred = Assert.IsType<DeferredProcessEngineCommandResult>(result);
        Assert.Equal(TimeSpan.FromMinutes(5), deferred.Delay);
        Assert.Equal("awaiting receipt", deferred.Reason);
    }

    [Fact]
    public async Task LinkStep_Defer_ReturnsDeferredResult()
    {
        // Any step may await an async dependency — deferral is not reserved for the final step.
        var task = new ArchiveTask
        {
            OnUploadDocs = _ =>
                Task.FromResult<ServiceTaskStepResult<CaseWithDocs>>(
                    ServiceTaskStepResult.Defer(TimeSpan.FromSeconds(30), "conversion running")
                ),
        };
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(baton: new CaseRef("case-1")), Payload("UploadDocs"));

        var deferred = Assert.IsType<DeferredProcessEngineCommandResult>(result);
        Assert.Equal(TimeSpan.FromSeconds(30), deferred.Delay);
        Assert.Equal("conversion running", deferred.Reason);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task LinkStep_Failure_MapsKind(bool permanent)
    {
        var task = new ArchiveTask
        {
            OnUploadDocs = _ =>
                Task.FromResult<ServiceTaskStepResult<CaseWithDocs>>(
                    permanent
                        ? ServiceTaskStepResult.FailedPermanent("upload rejected")
                        : ServiceTaskStepResult.FailedRetryable("upload timed out")
                ),
        };
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(baton: new CaseRef("case-1")), Payload("UploadDocs"));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal(permanent, failed.NonRetryable);
        Assert.Contains("Service task 'archive' failed", failed.ErrorMessage);
    }

    [Fact]
    public async Task StepThrows_ReturnsRetryableFailure()
    {
        var task = new ArchiveTask
        {
            OnCreateCase = _ => throw new InvalidOperationException("archive system exploded"),
        };
        var command = CreateCommand(task);

        var result = await command.Execute(CreateContext(), Payload("CreateCase"));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
        Assert.Equal("archive system exploded", failed.ErrorMessage);
    }

    [Fact]
    public async Task UnknownStepName_FailsPermanently_PointingAtTheRenameHazard()
    {
        var command = CreateCommand(new ArchiveTask());

        var result = await command.Execute(CreateContext(), Payload("OldStepName"));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Contains("no step named 'OldStepName'", failed.ErrorMessage);
        Assert.Contains("renamed", failed.ErrorMessage);
    }

    [Fact]
    public async Task StepNameIsCaseSensitive_UnlikeTaskTypeResolution()
    {
        // Task types match the BPMN attribute ignoring case; step names are exact — they are our
        // own wire values, produced from the same property that dispatches them.
        var command = CreateCommand(new ArchiveTask());

        var result = await command.Execute(CreateContext(), Payload("createcase"));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Contains("no step named 'createcase'", failed.ErrorMessage);
    }

    [Fact]
    public async Task StagedTaskWithoutStepName_FailsPermanently_AsKindMismatch()
    {
        var command = CreateCommand(new ArchiveTask());

        var result = await command.Execute(CreateContext(), Payload(null));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ServiceTaskKindMismatch", failed.ExceptionType);
    }

    [Fact]
    public async Task SimpleTaskWithStepName_FailsPermanently_AsKindMismatch()
    {
        var simple = new Mock<IServiceTask>();
        simple.Setup(x => x.Type).Returns("archive");
        var command = CreateCommand(simple.Object);

        var result = await command.Execute(CreateContext(), Payload("CreateCase"));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ServiceTaskKindMismatch", failed.ExceptionType);
        simple.Verify(x => x.Execute(It.IsAny<ServiceTaskContext>()), Times.Never);
    }

    [Fact]
    public async Task InputStepWithoutBaton_FailsPermanently()
    {
        var command = CreateCommand(new ArchiveTask());

        var result = await command.Execute(CreateContext(baton: null), Payload("UploadDocs"));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ServiceTaskStepInputMissing", failed.ExceptionType);
    }

    [Fact]
    public async Task StepContext_CarriesTheEngineIdentityAndClocks()
    {
        ServiceTaskContext<CaseRef>? observed = null;
        var task = new ArchiveTask
        {
            OnUploadDocs = ctx =>
            {
                observed = ctx;
                return Task.FromResult(ServiceTaskStepResult.Next(new CaseWithDocs(ctx.Input.CaseId, 1)));
            },
        };
        var command = CreateCommand(task);
        var context = CreateContext(baton: new CaseRef("case-1"));

        await command.Execute(context, Payload("UploadDocs"));

        Assert.NotNull(observed);
        Assert.Equal(context.Payload.WorkflowId, observed.WorkflowId);
        Assert.Equal(context.Payload.StepId, observed.StepId);
        Assert.Same(context.InstanceDataMutator, observed.InstanceDataMutator);
    }

    private sealed class PinnedNameTask : IStagedServiceTask
    {
        public string Type => "archive";

        public IEnumerable<IServiceTaskStep> Steps => [new Entry(), new Done()];

        private sealed class Entry : IServiceTaskStep<string>
        {
            // The rename escape hatch: the class was (hypothetically) renamed, the wire name pinned.
            public string Name => "legacySend";

            public Task<ServiceTaskStepResult<string>> Execute(ServiceTaskContext context) =>
                Task.FromResult(ServiceTaskStepResult.Next("sent"));
        }

        private sealed class Done : IFinalServiceTaskStep<string>
        {
            public Task<ServiceTaskResult> Execute(ServiceTaskContext<string> context) =>
                Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
        }
    }

    [Fact]
    public async Task PinnedStepName_OverridesTheClassNameDefault()
    {
        var command = CreateCommand(new PinnedNameTask());

        var pinned = await command.Execute(CreateContext(), Payload("legacySend"));
        Assert.IsType<SuccessfulProcessEngineCommandResult>(pinned);

        var byClassName = await command.Execute(CreateContext(), Payload("Entry"));
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(byClassName);
        Assert.Contains("no step named 'Entry'", failed.ErrorMessage);
    }
}
