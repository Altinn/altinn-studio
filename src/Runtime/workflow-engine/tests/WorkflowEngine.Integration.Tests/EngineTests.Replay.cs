using System.Net;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

public partial class EngineTests
{
    [Fact]
    public async Task Replay_WithOtherStateAndLabels_JoinsTheFirstWorkflowAndKeepsWhatItStored()
    {
        const string firstState = """{"signedWith":"first"}""";
        var firstWorkflowLabels = new Dictionary<string, string> { ["shownAs"] = "Send in" };
        var firstStepLabels = new Dictionary<string, string> { ["stepName"] = "Validate data" };
        var idempotencyKey = $"idem-{Guid.NewGuid()}";

        using var firstResponse = await _client.EnqueueRaw(
            CreateReplayRequest(firstState, firstWorkflowLabels, firstStepLabels),
            idempotencyKey: idempotencyKey
        );
        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);
        var workflowId = await ReadSingleWorkflowId(firstResponse);
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        using var replayResponse = await _client.EnqueueRaw(
            CreateReplayRequest(
                """{"signedWith":"second"}""",
                new Dictionary<string, string> { ["shownAs"] = "Submit" },
                new Dictionary<string, string> { ["stepName"] = "Validate the data" }
            ),
            idempotencyKey: idempotencyKey
        );

        Assert.Equal(HttpStatusCode.OK, replayResponse.StatusCode);
        Assert.Equal(workflowId, await ReadSingleWorkflowId(replayResponse));
        await _testHelpers.AssertDbWorkflowCount(1);
        await _testHelpers.AssertDbStepCount(1);

        var stored = await _client.GetWorkflow(workflowId);
        Assert.NotNull(stored);
        Assert.Equal(firstState, stored.InitialState);
        Assert.Equal(firstWorkflowLabels, stored.Labels);
        Assert.Equal(firstStepLabels, stored.Steps.Single().Labels);
    }

    [Fact]
    public async Task Replay_UnderAnotherCollectionKey_IsAConflict()
    {
        var request = CreateReplayRequest("state", workflowLabels: [], stepLabels: []);
        var idempotencyKey = $"idem-{Guid.NewGuid()}";

        using var firstResponse = await _client.EnqueueRaw(
            request,
            idempotencyKey: idempotencyKey,
            collectionKey: $"collection-{Guid.NewGuid()}"
        );
        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);

        using var replayResponse = await _client.EnqueueRaw(
            request,
            idempotencyKey: idempotencyKey,
            collectionKey: $"collection-{Guid.NewGuid()}"
        );

        Assert.Equal(HttpStatusCode.Conflict, replayResponse.StatusCode);
        await _testHelpers.AssertDbWorkflowCount(1);
    }

    private WorkflowEnqueueRequest CreateReplayRequest(
        string state,
        Dictionary<string, string> workflowLabels,
        Dictionary<string, string> stepLabels
    ) =>
        _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow(
                "wf-replay",
                [_testHelpers.CreateWebhookStep("/replay", labels: stepLabels)]
            ) with
            {
                State = state,
            }
        ) with
        {
            Labels = workflowLabels,
        };

    private static async Task<Guid> ReadSingleWorkflowId(HttpResponseMessage response) =>
        (await EngineApiClient.AssertSuccessAndDeserialize<WorkflowEnqueueResponse.Accepted>(response))
            .Workflows.Single()
            .DatabaseId;
}
