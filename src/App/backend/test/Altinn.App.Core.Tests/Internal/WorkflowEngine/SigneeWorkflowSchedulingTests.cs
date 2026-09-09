using System.Collections.Concurrent;
using System.Net;
using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class SigneeWorkflowSchedulingTests
{
    private static readonly Guid StateElementId = Guid.NewGuid();
    private static readonly Guid FirstSigneeId = Guid.NewGuid();
    private static readonly Guid SecondSigneeId = Guid.NewGuid();
    private static readonly Guid WorkflowId = Guid.NewGuid();
    private static readonly Guid StepId = Guid.NewGuid();
    private static readonly InstanceIdentifier InstanceId = new(501337, Guid.NewGuid());
    private const string TaskId = "Task_Signing";
    private const string State = "signed-published-state";

    [Fact]
    public async Task Initialization_AllDelegationsThenAllNotifications_PrecedeOriginalTailAndCommit()
    {
        var requests = new ConcurrentQueue<EnqueueCall>();
        var client = CreateClient(requests);
        using var services = CreateServices();
        var command = new ScheduleSigneeInitialization(services, CreateProcessReader().Object, client.Object);
        var payload = RoundTrip(CreateInitializationPayload());

        var result = await command.Execute(CreateContext(), payload);

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        EnqueueCall call = Assert.Single(requests);
        Assert.Equal("ttd/test-app", call.Namespace);
        Assert.Equal(InstanceId.InstanceGuid.ToString(), call.CollectionKey);
        Assert.Equal(ScheduleSigneeInitialization.CreateIdempotencyKey(StepId), call.Key);
        Assert.Equal(payload.Continuation!.Context!.Value.GetRawText(), call.Request.Context!.Value.GetRawText());
        Assert.Equal(payload.Continuation.Labels, call.Request.Labels);
        WorkflowRequest workflow = Assert.Single(call.Request.Workflows);
        Assert.True(workflow.IsHead);
        Assert.False(workflow.DependsOnHeads);
        Assert.Equal(WorkflowId, Assert.Single(workflow.DependsOn!).Id);
        Assert.Equal(State, workflow.State);
        Assert.Equal(
            new[]
            {
                "DelegateSigneeRights",
                "DelegateSigneeRights",
                "NotifySignee",
                "NotifySignee",
                "CustomerBeforeCommit",
                CommitProcessState.Key,
                EnqueueSideEffectsWorkflow.Key,
                "ExecuteServiceTask",
            },
            workflow.Steps.Select(SigningWorkflowSteps.GetKey)
        );
        Assert.Equal(
            new SigneeCommandPayload(TaskId, StateElementId, FirstSigneeId),
            Payload<SigneeCommandPayload>(workflow.Steps[0])
        );
        Assert.Equal(
            new SigneeCommandPayload(TaskId, StateElementId, SecondSigneeId),
            Payload<SigneeCommandPayload>(workflow.Steps[1])
        );
        Assert.All(
            workflow.Steps.Take(2),
            step =>
            {
                Assert.Equal(TimeSpan.FromSeconds(40), step.Command.MaxExecutionTime);
                Assert.Equal(4, step.RetryStrategy!.MaxRetries);
                Assert.Equal(
                    StateElementId.ToString("D"),
                    step.Labels![SigningWorkflowLabels.SigningInitializationLabel]
                );
            }
        );
        Assert.Equal(
            JsonSerializer.Serialize(payload.Continuation.Workflows[0].Steps[0]),
            JsonSerializer.Serialize(workflow.Steps[4])
        );
        Assert.Equal(
            JsonSerializer.Serialize(payload.Continuation.Workflows[0].Steps[^1]),
            JsonSerializer.Serialize(workflow.Steps[^1])
        );
        Assert.Equal(
            new SigneeCommandPayload(TaskId, StateElementId, FirstSigneeId),
            Payload<SigneeCommandPayload>(workflow.Steps[2])
        );
        Assert.Equal(
            new SigneeCommandPayload(TaskId, StateElementId, SecondSigneeId),
            Payload<SigneeCommandPayload>(workflow.Steps[3])
        );
        Assert.All(
            workflow.Steps.Skip(2).Take(2),
            step =>
            {
                Assert.Equal(TimeSpan.FromSeconds(60), step.Command.MaxExecutionTime);
                Assert.Equal(5, step.RetryStrategy!.MaxRetries);
                Assert.Equal(
                    StateElementId.ToString("D"),
                    step.Labels![SigningWorkflowLabels.SigningInitializationLabel]
                );
                Assert.Equal(TaskId, step.Labels[SigningWorkflowLabels.SigningTaskLabel]);
            }
        );
        Assert.Equal(FirstSigneeId.ToString("D"), workflow.Steps[2].Labels![SigningWorkflowLabels.SigningSigneeLabel]);
        Assert.Equal(SecondSigneeId.ToString("D"), workflow.Steps[3].Labels![SigningWorkflowLabels.SigningSigneeLabel]);
    }

    [Fact]
    public async Task Initialization_LostEnqueueResponse_ReplaysIdenticalKeyAndBody()
    {
        var requests = new ConcurrentQueue<EnqueueCall>();
        int attempts = 0;
        var client = CreateClient(
            requests,
            _ => Interlocked.Increment(ref attempts) == 1 ? new HttpRequestException("accepted, response lost") : null
        );
        using var services = CreateServices();
        var command = new ScheduleSigneeInitialization(services, CreateProcessReader().Object, client.Object);
        var payload = CreateInitializationPayload();

        var first = Assert.IsType<FailedProcessEngineCommandResult>(await command.Execute(CreateContext(), payload));
        Assert.False(first.NonRetryable);
        Assert.IsType<SuccessfulProcessEngineCommandResult>(await command.Execute(CreateContext(), RoundTrip(payload)));

        EnqueueCall[] calls = requests.ToArray();
        Assert.Equal(2, calls.Length);
        Assert.Equal(calls[0].Key, calls[1].Key);
        Assert.Equal(JsonSerializer.Serialize(calls[0].Request), JsonSerializer.Serialize(calls[1].Request));
    }

    [Theory]
    [InlineData(400, true)]
    [InlineData(409, true)]
    [InlineData(413, true)]
    [InlineData(422, true)]
    [InlineData(408, false)]
    [InlineData(429, false)]
    [InlineData(500, false)]
    public async Task Initialization_EnqueueRejection_IsPermanentUnlessTransient(int statusCode, bool permanent)
    {
        var requests = new ConcurrentQueue<EnqueueCall>();
        var client = CreateClient(
            requests,
            _ => new HttpRequestException("Engine rejected request", null, (HttpStatusCode)statusCode)
        );
        using var services = CreateServices();
        var command = new ScheduleSigneeInitialization(services, CreateProcessReader().Object, client.Object);

        var failure = Assert.IsType<FailedProcessEngineCommandResult>(
            await command.Execute(CreateContext(), CreateInitializationPayload())
        );

        Assert.Equal(permanent, failure.NonRetryable);
        Assert.Single(requests);
    }

    [Fact]
    public async Task Initialization_RequestedCancellation_IsPropagated()
    {
        using var cancellation = new CancellationTokenSource();
        var client = CreateClient(
            new ConcurrentQueue<EnqueueCall>(),
            _ =>
            {
                cancellation.Cancel();
                return new OperationCanceledException(cancellation.Token);
            }
        );
        using var services = CreateServices();
        var command = new ScheduleSigneeInitialization(services, CreateProcessReader().Object, client.Object);

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            command.Execute(CreateContext(cancellation.Token), CreateInitializationPayload())
        );
    }

    [Fact]
    public async Task Initialization_MissingCommit_IsPermanentAndDoesNotEnqueue()
    {
        var payload = CreateInitializationPayload();
        payload = payload with
        {
            Continuation = payload.Continuation! with
            {
                Workflows =
                [
                    payload.Continuation.Workflows[0] with
                    {
                        Steps = [SigningWorkflowSteps.Create("CustomerCommand")],
                    },
                ],
            },
        };
        using var services = new ServiceCollection().BuildServiceProvider();
        var command = new ScheduleSigneeInitialization(
            services,
            CreateProcessReader().Object,
            Mock.Of<IWorkflowEngineClient>(MockBehavior.Strict)
        );

        var failure = Assert.IsType<FailedProcessEngineCommandResult>(await command.Execute(CreateContext(), payload));

        Assert.True(failure.NonRetryable);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Initialization_ConfigurationRemoved_IsPermanentWithoutResolvingOrEnqueueing(
        bool missingConfiguration
    )
    {
        var reader = new Mock<IProcessReader>(MockBehavior.Strict);
        reader
            .Setup(value => value.GetAltinnTaskExtension(TaskId))
            .Returns(
                new AltinnTaskExtension
                {
                    SignatureConfiguration = missingConfiguration ? null : new AltinnSignatureConfiguration(),
                }
            );
        // No initialization service is registered: configuration failure must precede resolving dependencies.
        using var services = new ServiceCollection().BuildServiceProvider();
        var command = new ScheduleSigneeInitialization(
            services,
            reader.Object,
            Mock.Of<IWorkflowEngineClient>(MockBehavior.Strict)
        );

        var failure = Assert.IsType<FailedProcessEngineCommandResult>(
            await command.Execute(CreateContext(), CreateInitializationPayload())
        );

        Assert.True(failure.NonRetryable);
    }

    private static ScheduleSigneeInitializationPayload CreateInitializationPayload() =>
        new(
            TaskId,
            new WorkflowEnqueueRequest
            {
                Labels = new Dictionary<string, string>
                {
                    [ProcessNextRequestFactory.ProcessNextTargetIdLabel] = "Task_Signing:1",
                },
                Context = JsonSerializer.SerializeToElement(new { callbackToken = "frozen-token" }),
                Workflows =
                [
                    new WorkflowRequest
                    {
                        OperationId = "Process next: Task_1 -> Task_Signing",
                        Steps =
                        [
                            SigningWorkflowSteps.WithPayload(
                                SigningWorkflowSteps.Create("CustomerBeforeCommit"),
                                new ProcessTaskPayload("unchanged")
                            ),
                            SigningWorkflowSteps.Create(CommitProcessState.Key),
                            SigningWorkflowSteps.Create(EnqueueSideEffectsWorkflow.Key),
                            SigningWorkflowSteps.Create("ExecuteServiceTask"),
                        ],
                        IsHead = true,
                        DependsOnHeads = false,
                    },
                ],
            },
            SigningWorkflowSteps
                .Create("DelegateSigneeRights")
                .WithStepOptions(
                    new ProcessStepOptions
                    {
                        MaxExecutionTime = TimeSpan.FromSeconds(40),
                        RetryStrategy = ProcessStepRetryStrategy.Constant(TimeSpan.FromSeconds(1), maxRetries: 4),
                    }
                ),
            SigningWorkflowSteps
                .Create("NotifySignee")
                .WithStepOptions(
                    new ProcessStepOptions
                    {
                        MaxExecutionTime = TimeSpan.FromSeconds(60),
                        RetryStrategy = ProcessStepRetryStrategy.Constant(TimeSpan.FromSeconds(1), maxRetries: 5),
                    }
                )
        );

    private static ServiceProvider CreateServices()
    {
        var initialization = new Mock<ISigneeInitializationService>(MockBehavior.Strict);
        initialization
            .Setup(service =>
                service.GetResolvedSignees(
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<AltinnSignatureConfiguration>(),
                    TaskId,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new SigneeInitializationPlan(StateElementId, [FirstSigneeId, SecondSigneeId]));
        return new ServiceCollection().AddSingleton(initialization.Object).BuildServiceProvider();
    }

    private static Mock<IProcessReader> CreateProcessReader()
    {
        var reader = new Mock<IProcessReader>(MockBehavior.Strict);
        reader
            .Setup(value => value.GetAltinnTaskExtension(TaskId))
            .Returns(
                new AltinnTaskExtension
                {
                    SignatureConfiguration = new AltinnSignatureConfiguration
                    {
                        SigneeProviderId = "test-provider",
                        SigneeStatesDataTypeId = "signee-states",
                    },
                }
            );
        return reader;
    }

    private static ProcessEngineCommandContext CreateContext(CancellationToken ct = default) =>
        new()
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = InstanceId,
            WorkflowId = WorkflowId,
            StepId = StepId,
            StateCarry = new(),
            InstanceDataMutator = Mock.Of<IInstanceDataMutator>(),
            CancellationToken = ct,
            Payload = new AppCallbackPayload
            {
                CommandKey = ScheduleSigneeInitialization.Key,
                Actor = new Actor { UserId = 1337 },
                WorkflowId = WorkflowId,
                StepId = StepId,
                State = State,
                ExecutionReferenceTime = new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero),
            },
        };

    private static T Payload<T>(StepRequest step)
        where T : CommandRequestPayload =>
        CommandPayloadSerializer.Deserialize<T>(
            JsonSerializer.Deserialize<AppCommandData>(step.Command.Data!.Value)!.Payload
        )!;

    private static T RoundTrip<T>(T payload)
        where T : CommandRequestPayload =>
        CommandPayloadSerializer.Deserialize<T>(CommandPayloadSerializer.Serialize(payload))!;

    private static Mock<IWorkflowEngineClient> CreateClient(
        ConcurrentQueue<EnqueueCall> calls,
        Func<WorkflowEnqueueRequest, Exception?>? failure = null
    )
    {
        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(value =>
                value.EnqueueWorkflows(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(
                (string ns, string key, string? collection, WorkflowEnqueueRequest request, CancellationToken _) =>
                {
                    calls.Enqueue(new EnqueueCall(ns, key, collection, request));
                    return failure?.Invoke(request) is { } exception
                        ? Task.FromException<WorkflowEnqueueResponse.Accepted>(exception)
                        : Task.FromResult(new WorkflowEnqueueResponse.Accepted { Workflows = [] });
                }
            );
        return client;
    }

    private sealed record EnqueueCall(
        string Namespace,
        string Key,
        string? CollectionKey,
        WorkflowEnqueueRequest Request
    );
}
