using System.Net;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Models;

namespace WorkflowEngine.Integration.Tests;

public partial class EngineTests
{
    // ── Health endpoint responses ─────────────────────────────────────────────

    [Fact]
    public async Task Response_HealthLive_ReturnsExpectedShape()
    {
        using var client = fixture.CreateEngineClient();
        using var response = await client.GetAsync("/api/v1/health/live", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);
    }

    [Fact]
    public async Task Response_HealthReady_ReturnsExpectedShape()
    {
        using var client = fixture.CreateEngineClient();
        using var response = await client.GetAsync("/api/v1/health/ready", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);
    }

    [Fact]
    public async Task Response_HealthAggregate_ReturnsExpectedShape()
    {
        using var client = fixture.CreateEngineClient();
        using var response = await client.GetAsync("/api/v1/health", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);
    }

    // ── Enqueue endpoint responses ────────────────────────────────────────────

    [Fact]
    public async Task Response_Enqueue_SingleWebhookWorkflow_ReturnsAcceptedShape()
    {
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf-1", [_testHelpers.CreateWebhookStep("/ping")])
        );

        using var response = await _client.EnqueueRaw(_instanceGuid, request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body).ScrubMembers("databaseId");
    }

    [Fact]
    public async Task Response_Enqueue_MultipleWorkflows_ReturnsAcceptedShape()
    {
        var workflows = new[]
        {
            _testHelpers.CreateWorkflow("wf-a", [_testHelpers.CreateWebhookStep("/ping-a")]),
            _testHelpers.CreateWorkflow("wf-b", [_testHelpers.CreateWebhookStep("/ping-b")]),
        };
        var request = _testHelpers.CreateEnqueueRequest(workflows);

        using var response = await _client.EnqueueRaw(_instanceGuid, request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body).ScrubMembers("databaseId");
    }

    [Fact]
    public async Task Response_Enqueue_WithoutApiKey_Returns401()
    {
        using var unauthenticatedClient = fixture.CreateEngineClient();
        unauthenticatedClient.DefaultRequestHeaders.Remove("X-API-Key");

        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/ping")])
        );

        using var response = await unauthenticatedClient.PostAsJsonAsync(
            EngineApiClient.GetInstancePath(_instanceGuid),
            request,
            TestContext.Current.CancellationToken
        );

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Response_Enqueue_AppCommandWithoutLockToken_Returns400WithProblemDetails()
    {
        var request = new WorkflowEnqueueRequest
        {
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            IdempotencyKey = $"idem-{Guid.NewGuid()}",
            LockToken = null,
            Workflows =
            [
                new WorkflowRequest
                {
                    Ref = "wf",
                    OperationId = $"op-{Guid.NewGuid()}",
                    Steps = [new StepRequest { Command = new Command.AppCommand("do-something") }],
                },
            ],
        };

        using var response = await _client.EnqueueRaw(_instanceGuid, request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);
    }

    // ── GetWorkflow endpoint responses ────────────────────────────────────────

    [Fact]
    public async Task Response_GetWorkflow_CompletedWebhook_ReturnsFullDetailsShape()
    {
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf-1", [_testHelpers.CreateWebhookStep("/ping")])
        );
        var accepted = await _client.Enqueue(_instanceGuid, request);
        var workflowId = accepted.Workflows.Single().DatabaseId;

        await _client.WaitForWorkflowStatus(_instanceGuid, workflowId, PersistentItemStatus.Completed);

        using var response = await _client.GetWorkflowRaw(_instanceGuid, workflowId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);
    }

    [Fact]
    public async Task Response_GetWorkflow_CompletedAppCommand_ReturnsFullDetailsShape()
    {
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf-1", [_testHelpers.CreateAppCommandStep("do-something")]),
            lockToken: InstanceLockToken
        );
        var accepted = await _client.Enqueue(_instanceGuid, request);
        var workflowId = accepted.Workflows.Single().DatabaseId;

        await _client.WaitForWorkflowStatus(_instanceGuid, workflowId, PersistentItemStatus.Completed);

        using var response = await _client.GetWorkflowRaw(_instanceGuid, workflowId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);
    }

    [Fact]
    public async Task Response_GetWorkflow_MultipleSteps_ReturnsAllSteps()
    {
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow(
                "wf-1",
                [
                    _testHelpers.CreateWebhookStep("/step-1"),
                    _testHelpers.CreateWebhookStep("/step-2"),
                    _testHelpers.CreateWebhookStep("/step-3"),
                ]
            )
        );
        var accepted = await _client.Enqueue(_instanceGuid, request);
        var workflowId = accepted.Workflows.Single().DatabaseId;

        await _client.WaitForWorkflowStatus(_instanceGuid, workflowId, PersistentItemStatus.Completed);

        using var response = await _client.GetWorkflowRaw(_instanceGuid, workflowId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);
    }

    [Fact]
    public async Task Response_GetWorkflow_NonExistent_Returns404()
    {
        using var response = await _client.GetWorkflowRaw(_instanceGuid, Guid.NewGuid());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Response_GetWorkflow_WrongInstance_Returns404()
    {
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf-1", [_testHelpers.CreateWebhookStep("/ping")])
        );
        var accepted = await _client.Enqueue(_instanceGuid, request);
        var workflowId = accepted.Workflows.Single().DatabaseId;

        await _client.WaitForWorkflowStatus(_instanceGuid, workflowId, PersistentItemStatus.Completed);

        var wrongGuid = Guid.NewGuid();
        using var response = await _client.GetWorkflowRaw(wrongGuid, workflowId);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Response_GetWorkflow_WithDependencies_ShowsDependencyStatus()
    {
        var workflowA = _testHelpers.CreateWorkflow("wf-a", [_testHelpers.CreateWebhookStep("/ping-a")]);
        var workflowB = _testHelpers.CreateWorkflow(
            "wf-b",
            [_testHelpers.CreateWebhookStep("/ping-b")],
            dependsOn: ["wf-a"]
        );
        var request = _testHelpers.CreateEnqueueRequest([workflowA, workflowB]);

        var accepted = await _client.Enqueue(_instanceGuid, request);
        var workflowBId = accepted.Workflows.First(w => w.Ref == "wf-b").DatabaseId;

        await _client.WaitForWorkflowStatus(
            _instanceGuid,
            accepted.Workflows.Select(w => w.DatabaseId),
            PersistentItemStatus.Completed
        );

        using var response = await _client.GetWorkflowRaw(_instanceGuid, workflowBId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        body = Regex.Replace(body, @"""[0-9a-f\-]{36}"":", @"""{Scrubbed}"":"); // Scrub the workflow GUIDs from the `dependencies` dict
        await VerifyJson(body).ScrubInlineGuids();
    }

    // ── ListActiveWorkflows endpoint responses ────────────────────────────────

    [Fact]
    public async Task Response_ListActiveWorkflows_WhileProcessing_ReturnsWorkflowsShape()
    {
        // Arrange - slow WireMock so workflow stays active
        fixture.WireMock.Reset();
        fixture
            .WireMock.Given(Request.Create().WithPath("/slow").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200).WithDelay(TimeSpan.FromSeconds(5)));
        fixture.SetupDefaultStub();

        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf-1", [_testHelpers.CreateWebhookStep("/slow")])
        );
        await _client.Enqueue(_instanceGuid, request);

        // Small delay to ensure the workflow is picked up and in-flight
        await Task.Delay(200, TestContext.Current.CancellationToken);

        // Act
        using var client = fixture.CreateEngineClient();
        using var response = await client.GetAsync(
            EngineApiClient.GetInstancePath(_instanceGuid),
            TestContext.Current.CancellationToken
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);
    }

    [Fact]
    public async Task Response_ListActiveWorkflows_NoWorkflows_Returns204()
    {
        using var client = fixture.CreateEngineClient();
        using var response = await client.GetAsync(
            EngineApiClient.GetInstancePath(_instanceGuid),
            TestContext.Current.CancellationToken
        );

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Response_ListActiveWorkflows_AfterCompletion_Returns204()
    {
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf-1", [_testHelpers.CreateWebhookStep("/ping")])
        );
        var accepted = await _client.Enqueue(_instanceGuid, request);
        var workflowId = accepted.Workflows.Single().DatabaseId;

        await _client.WaitForWorkflowStatus(_instanceGuid, workflowId, PersistentItemStatus.Completed);

        using var client = fixture.CreateEngineClient();
        using var response = await client.GetAsync(
            EngineApiClient.GetInstancePath(_instanceGuid),
            TestContext.Current.CancellationToken
        );

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }
}
