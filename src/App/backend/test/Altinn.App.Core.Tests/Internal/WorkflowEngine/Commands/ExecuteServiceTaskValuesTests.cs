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
/// <see cref="ServiceTaskContext.Values"/> in a service task's pipeline: what a completed stage records reaches
/// the items after it through the workflow state carry, and stops traveling once the task concludes.
/// </summary>
public class ExecuteServiceTaskValuesTests
{
    private const string TaskType = "shipping";

    private sealed class ShippingTask : IPipelineServiceTask
    {
        public string Type => TaskType;

        public Func<ServiceTaskContext, Task<ServiceTaskStageResult>> OnSend { get; init; } =
            _ => Task.FromResult(ServiceTaskStageResult.Completed());

        public Func<ServiceTaskContext, Task<ServiceTaskResult>> OnAwait { get; init; } =
            _ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline.Stage(ctx => OnSend(ctx)).Finally(ctx => OnAwait(ctx));
    }

    private static string ValuesKey => WorkflowCallbackStateCarry.ServiceTaskValuesKey(TaskType);

    private static ExecuteServiceTask CreateCommand(IPipelineServiceTask serviceTask)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddSingleton(serviceTask);
        var sp = services.BuildServiceProvider();

        return new ExecuteServiceTask(
            sp.GetRequiredService<AppImplementationFactory>(),
            TestMailboxDeliveryEnvelope.Create()
        );
    }

    private static ProcessEngineCommandContext CreateContext(WorkflowCallbackStateCarry carry)
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
            StateCarry = carry,
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutatorMock.Object,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = ExecuteServiceTask.Key,
                Actor = new Actor { UserId = 1337 },
                ExecutionReferenceTime = new DateTimeOffset(2025, 3, 14, 9, 26, 53, TimeSpan.Zero),
                State = "{}",
                WorkflowId = Guid.NewGuid(),
                StepId = Guid.NewGuid(),
            },
        };
    }

    [Fact]
    public async Task CompletedStage_HandsItsValuesToTheConclusion_WhichDropsThem()
    {
        var carry = new WorkflowCallbackStateCarry();
        string? seenByConclusion = null;
        var task = new ShippingTask
        {
            OnSend = context =>
            {
                context.Values.Set("messageId", "m-1");
                return Task.FromResult(ServiceTaskStageResult.Completed());
            },
            OnAwait = context =>
            {
                seenByConclusion = context.Values.Get("messageId");
                return Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
            },
        };
        ExecuteServiceTask command = CreateCommand(task);

        await command.Execute(CreateContext(carry), new ExecuteServiceTaskPayload(TaskType, 0));
        Assert.Equal("m-1", carry.FindValues(ValuesKey)?["messageId"]);

        var concluded = Assert.IsType<SuccessfulProcessEngineCommandResult>(
            await command.Execute(CreateContext(carry), new ExecuteServiceTaskPayload(TaskType, 1))
        );
        Assert.NotNull(concluded.ProcessNextContinuation);
        Assert.Equal("m-1", seenByConclusion);
        // The task concluded: its values do not travel into the next transition.
        Assert.Null(carry.FindValues(ValuesKey));
    }

    [Fact]
    public async Task ConclusionThatDefers_KeepsTheStagesValuesForTheNextCheck()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordValues(ValuesKey, new Dictionary<string, string> { ["messageId"] = "m-1" });
        var task = new ShippingTask
        {
            OnAwait = _ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Defer(TimeSpan.FromMinutes(1))),
        };

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(carry), new ExecuteServiceTaskPayload(TaskType, 1));

        Assert.IsType<DeferredProcessEngineCommandResult>(result);
        Assert.Equal("m-1", carry.FindValues(ValuesKey)?["messageId"]);
    }

    [Fact]
    public async Task ConclusionThatRecordsAndDefers_FailsPermanently()
    {
        var task = new ShippingTask
        {
            OnAwait = context =>
            {
                context.Values.Set("status", "pending");
                return Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Defer(TimeSpan.FromMinutes(1)));
            },
        };

        ProcessEngineCommandResult result = await CreateCommand(task)
            .Execute(CreateContext(new WorkflowCallbackStateCarry()), new ExecuteServiceTaskPayload(TaskType, 1));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("PipelineValuesRecordedOnDeferral", failed.ExceptionType);
        Assert.Contains($"Service task '{TaskType}'", failed.ErrorMessage, StringComparison.Ordinal);
    }

    [Fact]
    public async Task FailedStage_KeepsNothingItRecorded()
    {
        var carry = new WorkflowCallbackStateCarry();
        var task = new ShippingTask
        {
            OnSend = context =>
            {
                context.Values.Set("messageId", "m-1");
                return Task.FromResult(ServiceTaskStageResult.FailedRetryable("Busy"));
            },
        };

        await CreateCommand(task).Execute(CreateContext(carry), new ExecuteServiceTaskPayload(TaskType, 0));

        Assert.Null(carry.FindValues(ValuesKey));
    }

    /// <summary>A new visit to the task starts on its first item, which sees nothing an earlier visit left.</summary>
    [Fact]
    public async Task FirstItem_StartsWithNoValues()
    {
        var carry = new WorkflowCallbackStateCarry();
        carry.RecordValues(ValuesKey, new Dictionary<string, string> { ["messageId"] = "from-last-visit" });
        string? seen = "unset";
        var task = new ShippingTask
        {
            OnSend = context =>
            {
                seen = context.Values.Get("messageId");
                return Task.FromResult(ServiceTaskStageResult.Completed());
            },
        };

        await CreateCommand(task).Execute(CreateContext(carry), new ExecuteServiceTaskPayload(TaskType, 0));

        Assert.Null(seen);
        Assert.Null(carry.FindValues(ValuesKey));
    }
}
