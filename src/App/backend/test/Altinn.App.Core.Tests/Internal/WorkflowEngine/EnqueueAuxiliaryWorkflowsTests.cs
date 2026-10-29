using System.Text.Json;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class EnqueueAuxiliaryWorkflowsTests
{
    private const string SignedTestState = "signed-commit-time-state-blob";

    private static readonly Guid _primaryWorkflowId = Guid.NewGuid();
    private static readonly InstanceIdentifier _instanceId = new(501337, Guid.NewGuid());

    private static WorkflowEnqueueRequest CreateEmbeddedRequest() =>
        new()
        {
            Labels = new Dictionary<string, string>(StringComparer.Ordinal) { ["processNextTargetTask"] = "Task_2" },
            // One single-step auxiliary workflow per command - the factory pre-assembles the whole batch.
            Workflows =
            [
                new WorkflowRequest
                {
                    OperationId = "Process next auxiliary: Task_1 -> Task_2 · MovedToAltinnEvent",
                    Steps = [],
                    IsHead = false,
                    DependsOnHeads = false,
                },
                new WorkflowRequest
                {
                    OperationId = "Process next auxiliary: Task_1 -> Task_2 · InstanceCreatedAltinnEvent",
                    Steps = [],
                    IsHead = false,
                    DependsOnHeads = false,
                },
            ],
        };

    private static ProcessEngineCommandContext CreateContext() =>
        new()
        {
            StateCarry = new(),
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = _instanceId,
            InstanceDataMutator = null!,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = EnqueueAuxiliaryWorkflows.Key,
                Actor = new Actor { UserId = 1337 },
                WorkflowId = _primaryWorkflowId,
                StepId = Guid.NewGuid(),
                State = SignedTestState,
                ExecutionReferenceTime = new DateTimeOffset(2025, 3, 14, 9, 26, 53, TimeSpan.Zero),
            },
        };

    [Fact]
    public async Task Execute_EnqueuesEverySiblingWithCommitTimeStateAndMainLink()
    {
        WorkflowEnqueueRequest? capturedRequest = null;
        string? capturedNs = null;
        string? capturedIdempotencyKey = null;
        string? capturedCollectionKey = null;
        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(c =>
                c.EnqueueWorkflows(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback(
                (
                    string ns,
                    string idempotencyKey,
                    string? collectionKey,
                    WorkflowEnqueueRequest request,
                    CancellationToken _
                ) =>
                {
                    capturedNs = ns;
                    capturedIdempotencyKey = idempotencyKey;
                    capturedCollectionKey = collectionKey;
                    capturedRequest = request;
                }
            )
            .ReturnsAsync(
                new WorkflowEnqueueResponse.Accepted
                {
                    Workflows = [new WorkflowResult { DatabaseId = Guid.NewGuid(), Namespace = "ttd/test-app" }],
                }
            );
        var tokens = new RecordingCallbackTokenGenerator();
        var command = new EnqueueAuxiliaryWorkflows(client.Object, tokens);
        var payload = new EnqueueAuxiliaryWorkflowsPayload(CreateEmbeddedRequest());

        ProcessEngineCommandResult result = await command.Execute(CreateContext(), payload);

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Equal("ttd/test-app", capturedNs);
        // Deterministic per primary workflow, covering the whole sibling batch: retries of the step
        // dedup on the idempotency key.
        Assert.Equal($"{_primaryWorkflowId}:auxiliary", capturedIdempotencyKey);
        Assert.Equal(_instanceId.InstanceGuid.ToString(), capturedCollectionKey);

        Assert.NotNull(capturedRequest);
        var context = JsonSerializer.Deserialize<AppWorkflowContext>(capturedRequest.Context!.Value)!;
        Assert.Equal(CreateContext().Payload.Actor, context.Actor);
        Assert.Equal(_instanceId.InstanceGuid, context.InstanceGuid);
        tokens.AssertMintedFor(capturedRequest);
        Assert.Equal(2, capturedRequest.Workflows.Count);
        Assert.All(
            capturedRequest.Workflows,
            enqueued =>
            {
                // The commit-time state blob this step executed with becomes each sibling's own state.
                Assert.Equal(SignedTestState, enqueued.State);
                // Linked (not dependency-bound) to the primary workflow for ops traversal.
                WorkflowRef link = Assert.Single(enqueued.Links!);
                Assert.True(link.IsId);
                Assert.Equal(_primaryWorkflowId, link.Id);
                // The factory-assembled directives travel through unchanged.
                Assert.False(enqueued.IsHead);
                Assert.False(enqueued.DependsOnHeads);
                Assert.Null(enqueued.DependsOn);
            }
        );
    }

    [Fact]
    public async Task Execute_EnqueueThrows_ReturnsRetryableFailure()
    {
        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        client
            .Setup(c =>
                c.EnqueueWorkflows(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new HttpRequestException("engine unavailable"));
        var command = new EnqueueAuxiliaryWorkflows(
            client.Object,
            Mock.Of<IWorkflowCallbackTokenGenerator>(g =>
                g.GenerateToken(_instanceId.InstanceGuid, It.IsAny<Actor>(), It.IsAny<IEnumerable<WorkflowRequest>>())
                == "callback-token"
            )
        );
        var payload = new EnqueueAuxiliaryWorkflowsPayload(CreateEmbeddedRequest());

        ProcessEngineCommandResult result = await command.Execute(CreateContext(), payload);

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
    }

    [Fact]
    public async Task Execute_PayloadWithNoWorkflows_FailsPermanently()
    {
        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        var command = new EnqueueAuxiliaryWorkflows(
            client.Object,
            Mock.Of<IWorkflowCallbackTokenGenerator>(g =>
                g.GenerateToken(_instanceId.InstanceGuid, It.IsAny<Actor>(), It.IsAny<IEnumerable<WorkflowRequest>>())
                == "callback-token"
            )
        );
        var payload = new EnqueueAuxiliaryWorkflowsPayload(CreateEmbeddedRequest() with { Workflows = [] });

        ProcessEngineCommandResult result = await command.Execute(CreateContext(), payload);

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
    }

    [Fact]
    public void Payload_RoundTripsThroughCommandPayloadSerialization()
    {
        // The payload travels app -> engine -> app callback as an opaque string; guard that the
        // embedded enqueue request (without runtime authentication) survives the round trip.
        var payload = new EnqueueAuxiliaryWorkflowsPayload(CreateEmbeddedRequest());

        string? serialized = CommandPayloadSerializer.Serialize(payload);
        EnqueueAuxiliaryWorkflowsPayload? roundTripped =
            CommandPayloadSerializer.Deserialize<EnqueueAuxiliaryWorkflowsPayload>(serialized);

        Assert.NotNull(roundTripped);
        Assert.Equal(2, roundTripped.EnqueueRequest.Workflows.Count);
        WorkflowRequest workflow = roundTripped.EnqueueRequest.Workflows[0];
        Assert.Equal("Process next auxiliary: Task_1 -> Task_2 · MovedToAltinnEvent", workflow.OperationId);
        Assert.False(workflow.IsHead);
        Assert.False(workflow.DependsOnHeads);
        Assert.Equal("Task_2", roundTripped.EnqueueRequest.Labels?["processNextTargetTask"]);
        Assert.Null(roundTripped.EnqueueRequest.Context);
    }
}
