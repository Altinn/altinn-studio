using System.Text.Json;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class EnqueueSideEffectsWorkflowTests
{
    private const string SignedTestState = "signed-commit-time-state-blob";

    private static readonly Guid _mainWorkflowId = Guid.NewGuid();
    private static readonly InstanceIdentifier _instanceId = new(501337, Guid.NewGuid());

    private static WorkflowEnqueueRequest CreateEmbeddedRequest() =>
        new()
        {
            Labels = new Dictionary<string, string>(StringComparer.Ordinal) { ["processNextTargetId"] = "Task_2:1" },
            Context = JsonSerializer.SerializeToElement(new { lockToken = "lock-token" }),
            // One single-step sibling per side effect - the factory pre-assembles the whole batch.
            Workflows =
            [
                new WorkflowRequest
                {
                    OperationId = "Process next side-effects: Task_1 -> Task_2 · MovedToAltinnEvent",
                    Steps = [],
                    IsHead = false,
                    DependsOnHeads = false,
                },
                new WorkflowRequest
                {
                    OperationId = "Process next side-effects: Task_1 -> Task_2 · InstanceCreatedAltinnEvent",
                    Steps = [],
                    IsHead = false,
                    DependsOnHeads = false,
                },
            ],
        };

    private static ProcessEngineCommandContext CreateContext() =>
        new()
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = _instanceId,
            InstanceDataMutator = null!,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = EnqueueSideEffectsWorkflow.Key,
                Actor = new Actor { UserId = 1337 },
                LockToken = "lock-token",
                WorkflowId = _mainWorkflowId,
                State = SignedTestState,
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
        var command = new EnqueueSideEffectsWorkflow(client.Object);
        var payload = new EnqueueSideEffectsWorkflowPayload(CreateEmbeddedRequest());

        ProcessEngineCommandResult result = await command.Execute(CreateContext(), payload);

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Equal("ttd/test-app", capturedNs);
        // Deterministic per Main workflow, covering the whole sibling batch: retries of the step
        // dedup on the idempotency key.
        Assert.Equal($"{_mainWorkflowId}:side-effects", capturedIdempotencyKey);
        Assert.Equal(_instanceId.InstanceGuid.ToString(), capturedCollectionKey);

        Assert.NotNull(capturedRequest);
        Assert.Equal(2, capturedRequest.Workflows.Count);
        Assert.All(
            capturedRequest.Workflows,
            enqueued =>
            {
                // The commit-time state blob this step executed with becomes each sibling's own state.
                Assert.Equal(SignedTestState, enqueued.State);
                // Linked (not dependency-bound) to the Main workflow for ops traversal.
                WorkflowRef link = Assert.Single(enqueued.Links!);
                Assert.True(link.IsId);
                Assert.Equal(_mainWorkflowId, link.Id);
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
        var command = new EnqueueSideEffectsWorkflow(client.Object);
        var payload = new EnqueueSideEffectsWorkflowPayload(CreateEmbeddedRequest());

        ProcessEngineCommandResult result = await command.Execute(CreateContext(), payload);

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
    }

    [Fact]
    public async Task Execute_PayloadWithNoWorkflows_FailsPermanently()
    {
        var client = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        var command = new EnqueueSideEffectsWorkflow(client.Object);
        var payload = new EnqueueSideEffectsWorkflowPayload(CreateEmbeddedRequest() with { Workflows = [] });

        ProcessEngineCommandResult result = await command.Execute(CreateContext(), payload);

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
    }

    [Fact]
    public void Payload_RoundTripsThroughCommandPayloadSerialization()
    {
        // The payload travels app -> engine -> app callback as an opaque string; guard that the
        // embedded enqueue request (incl. context element and directives) survives the round trip.
        var payload = new EnqueueSideEffectsWorkflowPayload(CreateEmbeddedRequest());

        string? serialized = CommandPayloadSerializer.Serialize(payload);
        EnqueueSideEffectsWorkflowPayload? roundTripped =
            CommandPayloadSerializer.Deserialize<EnqueueSideEffectsWorkflowPayload>(serialized);

        Assert.NotNull(roundTripped);
        Assert.Equal(2, roundTripped.EnqueueRequest.Workflows.Count);
        WorkflowRequest workflow = roundTripped.EnqueueRequest.Workflows[0];
        Assert.Equal("Process next side-effects: Task_1 -> Task_2 · MovedToAltinnEvent", workflow.OperationId);
        Assert.False(workflow.IsHead);
        Assert.False(workflow.DependsOnHeads);
        Assert.Equal("Task_2:1", roundTripped.EnqueueRequest.Labels?["processNextTargetId"]);
        Assert.NotNull(roundTripped.EnqueueRequest.Context);
    }
}
