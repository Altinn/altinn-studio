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
        var request = CreateEnqueueRequest(CreateWorkflow("wf-1", WorkflowType.Generic, [CreateWebhookStep("/ping")]));

        using var response = await _client.EnqueueRaw(Org, App, PartyId, _instanceGuid, request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body).ScrubMembers("databaseId");
    }

    [Fact]
    public async Task Response_Enqueue_MultipleWorkflows_ReturnsAcceptedShape()
    {
        var workflows = new[]
        {
            CreateWorkflow("wf-a", WorkflowType.Generic, [CreateWebhookStep("/ping-a")]),
            CreateWorkflow("wf-b", WorkflowType.Generic, [CreateWebhookStep("/ping-b")]),
        };
        var request = CreateEnqueueRequest(workflows);

        using var response = await _client.EnqueueRaw(Org, App, PartyId, _instanceGuid, request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body).ScrubMembers("databaseId");
    }

    [Fact]
    public async Task Response_Enqueue_WithoutApiKey_Returns401()
    {
        using var unauthenticatedClient = fixture.CreateEngineClient();
        unauthenticatedClient.DefaultRequestHeaders.Remove("X-API-Key");

        var request = CreateEnqueueRequest(CreateWorkflow("wf", WorkflowType.Generic, [CreateWebhookStep("/ping")]));

        using var response = await unauthenticatedClient.PostAsJsonAsync(
            $"{EngineAppFixture.ApiBasePath}/{Org}/{App}/{PartyId}/{_instanceGuid}",
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
            LockToken = null,
            Workflows =
            [
                new WorkflowRequest
                {
                    Ref = "wf",
                    OperationId = $"op-{Guid.NewGuid()}",
                    IdempotencyKey = $"key-{Guid.NewGuid()}",
                    Type = WorkflowType.AppProcessChange,
                    Steps = [new StepRequest { Command = new Command.AppCommand("do-something") }],
                },
            ],
        };

        using var response = await _client.EnqueueRaw(Org, App, PartyId, _instanceGuid, request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);
    }

    [Fact]
    public async Task Response_Enqueue_ConcurrencyViolation_Returns409WithProblemDetails()
    {
        // Arrange - first workflow stays in Processing via slow WireMock
        fixture.WireMock.Reset();
        fixture
            .WireMock.Given(Request.Create().WithPath("/slow").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200).WithDelay(TimeSpan.FromSeconds(5)));
        fixture.SetupDefaultStub();

        var requestA = CreateEnqueueRequest(
            CreateWorkflow("wf-a", WorkflowType.AppProcessChange, [CreateWebhookStep("/slow")]),
            lockToken: LockToken
        );
        var requestB = CreateEnqueueRequest(
            CreateWorkflow("wf-b", WorkflowType.AppProcessChange, [CreateWebhookStep("/quick")]),
            lockToken: LockToken
        );

        // Act - enqueue A, then B while A is still processing
        await _client.Enqueue(Org, App, PartyId, _instanceGuid, requestA);
        using var responseB = await _client.EnqueueRaw(Org, App, PartyId, _instanceGuid, requestB);

        Assert.Equal(HttpStatusCode.Conflict, responseB.StatusCode);

        var body = await responseB.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body).ScrubMembers("detail");
    }

    // ── GetWorkflow endpoint responses ────────────────────────────────────────

    [Fact]
    public async Task Response_GetWorkflow_CompletedWebhook_ReturnsFullDetailsShape()
    {
        var request = CreateEnqueueRequest(CreateWorkflow("wf-1", WorkflowType.Generic, [CreateWebhookStep("/ping")]));
        var accepted = await _client.Enqueue(Org, App, PartyId, _instanceGuid, request);
        var workflowId = accepted.Workflows.Single().DatabaseId;

        await WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        using var response = await _client.GetWorkflowRaw(Org, App, PartyId, _instanceGuid, workflowId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body).ScrubInlineGuids();
    }

    [Fact]
    public async Task Response_GetWorkflow_CompletedAppCommand_ReturnsFullDetailsShape()
    {
        var request = CreateEnqueueRequest(
            CreateWorkflow("wf-1", WorkflowType.AppProcessChange, [CreateAppCommandStep("do-something")]),
            lockToken: LockToken
        );
        var accepted = await _client.Enqueue(Org, App, PartyId, _instanceGuid, request);
        var workflowId = accepted.Workflows.Single().DatabaseId;

        await WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        using var response = await _client.GetWorkflowRaw(Org, App, PartyId, _instanceGuid, workflowId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body).ScrubInlineGuids();
    }

    [Fact]
    public async Task Response_GetWorkflow_MultipleSteps_ReturnsAllSteps()
    {
        var request = CreateEnqueueRequest(
            CreateWorkflow(
                "wf-1",
                WorkflowType.Generic,
                [CreateWebhookStep("/step-1"), CreateWebhookStep("/step-2"), CreateWebhookStep("/step-3")]
            )
        );
        var accepted = await _client.Enqueue(Org, App, PartyId, _instanceGuid, request);
        var workflowId = accepted.Workflows.Single().DatabaseId;

        await WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        using var response = await _client.GetWorkflowRaw(Org, App, PartyId, _instanceGuid, workflowId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body).ScrubInlineGuids();
    }

    [Fact]
    public async Task Response_GetWorkflow_NonExistent_Returns404()
    {
        using var response = await _client.GetWorkflowRaw(Org, App, PartyId, _instanceGuid, 999999);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Response_GetWorkflow_WrongInstance_Returns404()
    {
        var request = CreateEnqueueRequest(CreateWorkflow("wf-1", WorkflowType.Generic, [CreateWebhookStep("/ping")]));
        var accepted = await _client.Enqueue(Org, App, PartyId, _instanceGuid, request);
        var workflowId = accepted.Workflows.Single().DatabaseId;

        await WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        var wrongGuid = Guid.NewGuid();
        using var response = await _client.GetWorkflowRaw(Org, App, PartyId, wrongGuid, workflowId);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Response_GetWorkflow_WithDependencies_ShowsDependencyStatus()
    {
        var workflowA = CreateWorkflow("wf-a", WorkflowType.Generic, [CreateWebhookStep("/ping-a")]);
        var workflowB = CreateWorkflow(
            "wf-b",
            WorkflowType.Generic,
            [CreateWebhookStep("/ping-b")],
            dependsOn: ["wf-a"]
        );
        var request = CreateEnqueueRequest([workflowA, workflowB]);

        var accepted = await _client.Enqueue(Org, App, PartyId, _instanceGuid, request);
        var workflowBId = accepted.Workflows.First(w => w.Ref == "wf-b").DatabaseId;

        await WaitForWorkflowStatus(accepted.Workflows.Select(w => w.DatabaseId), PersistentItemStatus.Completed);

        using var response = await _client.GetWorkflowRaw(Org, App, PartyId, _instanceGuid, workflowBId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        body = Regex.Replace(body, @"""(\d{1,})"":", @"""{Scrubbed}"":"); // Scrub the workflow IDs from the `dependencies` dict
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

        var request = CreateEnqueueRequest(CreateWorkflow("wf-1", WorkflowType.Generic, [CreateWebhookStep("/slow")]));
        await _client.Enqueue(Org, App, PartyId, _instanceGuid, request);

        // Small delay to ensure the workflow is picked up and in-flight
        await Task.Delay(200, TestContext.Current.CancellationToken);

        // Act
        using var client = fixture.CreateEngineClient();
        using var response = await client.GetAsync(
            $"{EngineAppFixture.ApiBasePath}/{Org}/{App}/{PartyId}/{_instanceGuid}",
            TestContext.Current.CancellationToken
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body).ScrubInlineGuids();
    }

    [Fact]
    public async Task Response_ListActiveWorkflows_NoWorkflows_Returns204()
    {
        using var client = fixture.CreateEngineClient();
        using var response = await client.GetAsync(
            $"{EngineAppFixture.ApiBasePath}/{Org}/{App}/{PartyId}/{_instanceGuid}",
            TestContext.Current.CancellationToken
        );

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Response_ListActiveWorkflows_AfterCompletion_Returns204()
    {
        var request = CreateEnqueueRequest(CreateWorkflow("wf-1", WorkflowType.Generic, [CreateWebhookStep("/ping")]));
        var accepted = await _client.Enqueue(Org, App, PartyId, _instanceGuid, request);
        var workflowId = accepted.Workflows.Single().DatabaseId;

        await WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        using var client = fixture.CreateEngineClient();
        using var response = await client.GetAsync(
            $"{EngineAppFixture.ApiBasePath}/{Org}/{App}/{PartyId}/{_instanceGuid}",
            TestContext.Current.CancellationToken
        );

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }
}
