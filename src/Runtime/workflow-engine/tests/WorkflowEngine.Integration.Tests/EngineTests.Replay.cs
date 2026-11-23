using System.Net;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

public partial class EngineTests
{
    [Fact]
    public async Task Replay_WithOtherStateAndStepLabels_JoinsTheFirstWorkflowAndKeepsWhatItStored()
    {
        const string firstState = """{"signedWith":"first"}""";
        var firstStepLabels = new Dictionary<string, string> { ["stepName"] = "Validate data" };
        var idempotencyKey = $"idem-{Guid.NewGuid()}";

        using var firstResponse = await _client.EnqueueRaw(
            CreateReplayRequest(firstState, firstStepLabels),
            idempotencyKey: idempotencyKey
        );
        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);
        var workflowId = await ReadSingleWorkflowId(firstResponse);
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        using var replayResponse = await _client.EnqueueRaw(
            CreateReplayRequest(
                """{"signedWith":"second"}""",
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
        Assert.Equal(firstStepLabels, stored.Steps.Single().Labels);
    }

    private WorkflowEnqueueRequest CreateReplayRequest(string state, Dictionary<string, string> stepLabels) =>
        _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow(
                "wf-replay",
                [_testHelpers.CreateWebhookStep("/replay", labels: stepLabels)]
            ) with
            {
                State = state,
            }
        );

    private static async Task<Guid> ReadSingleWorkflowId(HttpResponseMessage response) =>
        (await EngineApiClient.AssertSuccessAndDeserialize<WorkflowEnqueueResponse.Accepted>(response))
            .Workflows.Single()
            .DatabaseId;
}
