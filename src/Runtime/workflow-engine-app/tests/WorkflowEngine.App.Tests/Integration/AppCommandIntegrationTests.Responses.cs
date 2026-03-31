using System.Net;
using WorkflowEngine.App.Tests.Fixtures;
using WorkflowEngine.Models;

namespace WorkflowEngine.App.Tests.Integration;

public sealed partial class AppCommandIntegrationTests
{
    // ── Enqueue endpoint responses ────────────────────────────────────────────

    [Fact]
    public async Task Response_Enqueue_SingleAppCommandWorkflow_ReturnsAcceptedShape()
    {
        var step = AppTestHelpers.CreateAppCommandStep("/enqueue-shape");
        var request = AppTestHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf-1", [step]),
            lockToken: InstanceLockToken
        );

        using var response = await _client.EnqueueRaw(request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body).ScrubMembers("databaseId");
    }

    [Fact]
    public async Task Response_Enqueue_AppCommandWithoutLockToken_Returns400WithProblemDetails()
    {
        var step = AppTestHelpers.CreateAppCommandStep("/no-lock");
        var request = AppTestHelpers.CreateEnqueueRequest(_testHelpers.CreateWorkflow("wf-1", [step]), lockToken: null);

        using var response = await _client.EnqueueRaw(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);
    }

    // ── GetWorkflow endpoint responses ────────────────────────────────────────

    [Fact]
    public async Task Response_GetWorkflow_CompletedAppCommand_ReturnsFullDetailsShape()
    {
        var step = AppTestHelpers.CreateAppCommandStep("/details-shape");
        var request = AppTestHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf-1", [step]),
            lockToken: InstanceLockToken
        );
        var accepted = await _client.Enqueue(request);
        var workflowId = accepted.Workflows.Single().DatabaseId;

        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        using var response = await _client.GetWorkflowRaw(workflowId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);
    }

    [Fact]
    public async Task Response_GetWorkflow_MultipleAppCommandSteps_ReturnsAllSteps()
    {
        var steps = new[]
        {
            AppTestHelpers.CreateAppCommandStep("/multi-step-1"),
            AppTestHelpers.CreateAppCommandStep("/multi-step-2"),
            AppTestHelpers.CreateAppCommandStep("/multi-step-3"),
        };
        var request = AppTestHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf-1", steps),
            lockToken: InstanceLockToken
        );
        var accepted = await _client.Enqueue(request);
        var workflowId = accepted.Workflows.Single().DatabaseId;

        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        using var response = await _client.GetWorkflowRaw(workflowId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);
    }

    // ── Callback payload snapshot ─────────────────────────────────────────────

    [Fact]
    public async Task Response_AppCommandCallback_PayloadShape()
    {
        var step = AppTestHelpers.CreateAppCommandStep("/snapshot-callback", payload: "test-payload");
        var request = AppTestHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf-1", [step]),
            lockToken: InstanceLockToken
        );
        var accepted = await _client.Enqueue(request);
        var workflowId = accepted.Workflows.Single().DatabaseId;

        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        var logs = fixture.WireMock.LogEntries;
        Assert.Single(logs);

        var body = logs[0].RequestMessage.Body;
        Assert.NotNull(body);

        await VerifyJson(body).ScrubMembers("workflowId");
    }
}
