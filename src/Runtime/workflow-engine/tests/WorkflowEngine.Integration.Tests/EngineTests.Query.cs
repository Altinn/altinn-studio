using System.Net;
using Microsoft.EntityFrameworkCore;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

public partial class EngineTests
{
    [Fact]
    public async Task ListWorkflows_StatusFilter_IsCaseInsensitive()
    {
        // Arrange — a workflow that runs to completion.
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/hook")])
        );
        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        // Act — filter using a lowercase status (query binding bypasses the JSON converter).
        using var lower = await _client.ListWorkflowsRaw("?status=completed");

        // Assert — accepted and returns the workflow, identical to the PascalCase form.
        Assert.Equal(HttpStatusCode.OK, lower.StatusCode);
        var body = await EngineApiClient.AssertSuccessAndDeserialize<PaginatedResponse<WorkflowStatusResponse>>(lower);
        Assert.Contains(body.Data, w => w.DatabaseId == workflowId);
    }

    [Theory]
    [InlineData("bogus")]
    // The numeric forms are the interesting cases: they parse to real enum members, so a
    // name-only parser is the only thing standing between "?status=4" and a silent filter
    // to Failed. The sibling failures filter on ListCollections is pinned the same way.
    [InlineData("0")]
    [InlineData("4")]
    [InlineData("-1")]
    public async Task ListWorkflows_UnknownStatus_ReturnsBadRequest(string status)
    {
        using var response = await _client.ListWorkflowsRaw($"?status={status}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ListWorkflows_RoleFilter_MatchesDerivedRole()
    {
        // Arrange — one workflow per isHead directive value: unset (the ordinary default),
        // explicit true, and explicit false (auxiliary).
        var request = _testHelpers.CreateEnqueueRequest([
            _testHelpers.CreateWorkflow("wf-null", [_testHelpers.CreateWebhookStep("/hook")]),
            _testHelpers.CreateWorkflow("wf-true", [_testHelpers.CreateWebhookStep("/hook")], isHead: true),
            _testHelpers.CreateWorkflow("wf-false", [_testHelpers.CreateWebhookStep("/hook")], isHead: false),
        ]);
        var response = await _client.Enqueue(request);
        var byRef = response.Workflows.ToDictionary(w => w.Ref!, w => w.DatabaseId);
        await _client.WaitForWorkflowStatus(byRef.Values, PersistentItemStatus.Completed);

        // Act
        var primary = await _client.ListWorkflowsPaginated(role: WorkflowRole.Primary);
        var auxiliary = await _client.ListWorkflowsPaginated(role: WorkflowRole.Auxiliary);
        var unfiltered = await _client.ListWorkflowsPaginated();

        // Assert — role=primary is not directive equality: it must include the null-directive
        // workflow (the default for nearly every ordinary workflow), while role=auxiliary matches
        // exactly the isHead=false one.
        Assert.Equal(2, primary.TotalCount);
        Assert.Contains(primary.Data, w => w.DatabaseId == byRef["wf-null"]);
        Assert.Contains(primary.Data, w => w.DatabaseId == byRef["wf-true"]);
        Assert.All(primary.Data, w => Assert.Equal(WorkflowRole.Primary, w.Role));

        var auxiliaryWorkflow = Assert.Single(auxiliary.Data);
        Assert.Equal(byRef["wf-false"], auxiliaryWorkflow.DatabaseId);
        Assert.Equal(WorkflowRole.Auxiliary, auxiliaryWorkflow.Role);

        Assert.Equal(3, unfiltered.TotalCount);

        // isHead stays the raw directive next to the derived role.
        Assert.Null(primary.Data.Single(w => w.DatabaseId == byRef["wf-null"]).IsHead);
        Assert.Equal(true, primary.Data.Single(w => w.DatabaseId == byRef["wf-true"]).IsHead);
        Assert.Equal(false, auxiliaryWorkflow.IsHead);
    }

    [Theory]
    [InlineData("bogus")]
    [InlineData("false")]
    [InlineData("1")]
    public async Task ListWorkflows_InvalidRoleValue_ReturnsBadRequest(string role)
    {
        using var response = await _client.ListWorkflowsRaw($"?role={role}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetWorkflow_AfterCompletion_ReturnsFullDetails()
    {
        // Arrange
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/hook")])
        );

        // Act
        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        var workflow = await _client.GetWorkflow(workflowId);

        // Assert
        Assert.NotNull(workflow);
        Assert.Equal(workflowId, workflow.DatabaseId);
        Assert.Equal(PersistentItemStatus.Completed, workflow.OverallStatus);
        Assert.Equal(PersistentItemStatus.Completed, workflow.Steps[0].Status);
        Assert.NotNull(workflow.UpdatedAt);
        Assert.Single(workflow.Steps);
    }

    [Fact]
    public async Task StatusReads_WithIncludeStateFalse_LeaveTheStatePayloadOff()
    {
        // Arrange — a workflow enqueued with a state payload: the app's own data, which a status
        // reader such as Studio's admin panel must be able to leave off.
        const string statePayload = "{\"personNumber\":\"01017512345\"}";
        var template = _testHelpers.CreateWorkflow("wf-state", [_testHelpers.CreateWebhookStep("/hook")]);
        var request = _testHelpers.CreateEnqueueRequest(
            new WorkflowRequest
            {
                Ref = template.Ref,
                OperationId = template.OperationId,
                Steps = template.Steps,
                State = statePayload,
            }
        );
        var enqueued = await _client.Enqueue(request);
        var workflowId = enqueued.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        using var client = fixture.CreateEngineClient();
        var ns = EngineApiClient.DefaultNamespace;
        var ct = TestContext.Current.CancellationToken;

        // Act
        var withState = await client.GetStringAsync($"/api/v1/{ns}/workflows/{workflowId}", ct);
        var withoutState = await client.GetStringAsync($"/api/v1/{ns}/workflows/{workflowId}?includeState=false", ct);
        var listWithoutState = await client.GetStringAsync(
            $"/api/v1/{ns}/workflows?status=Completed&includeState=false",
            ct
        );

        // Assert — the default keeps the payload; leaving it off drops the field itself, on both reads.
        Assert.Contains("01017512345", withState, StringComparison.Ordinal);
        Assert.DoesNotContain("01017512345", withoutState, StringComparison.Ordinal);
        Assert.DoesNotContain("\"initialState\"", withoutState, StringComparison.Ordinal);
        Assert.DoesNotContain("\"stateOut\"", withoutState, StringComparison.Ordinal);
        Assert.Contains(workflowId.ToString(), listWithoutState, StringComparison.Ordinal);
        Assert.DoesNotContain("01017512345", listWithoutState, StringComparison.Ordinal);
        Assert.DoesNotContain("\"initialState\"", listWithoutState, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ListActiveWorkflows_ReturnsWorkflowWhileStillProcessing()
    {
        // Arrange
        // Use a WireMock delay so the step stays in Processing while we list.
        fixture.WireMock.Reset();
        fixture
            .WireMock.Given(Request.Create().WithPath("/slow-list").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200).WithDelay(TimeSpan.FromSeconds(10)));
        fixture.SetupDefaultStub();

        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/slow-list")])
        );

        // Act
        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;

        // Poll until the engine picks up the workflow (Enqueued or Processing).
        var deadline = DateTimeOffset.UtcNow.AddSeconds(10);
        List<WorkflowStatusResponse> active;
        do
        {
            active = await _client.ListActiveWorkflows();
            if (active.Count > 0)
                break;
            await Task.Delay(100, TestContext.Current.CancellationToken);
        } while (DateTimeOffset.UtcNow < deadline);

        // Assert
        Assert.NotEmpty(active);
        Assert.Single(active);
        Assert.Equal(workflowId, active[0].DatabaseId);

        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);
    }

    [Fact]
    public async Task ListActiveWorkflows_ReturnsNoContent_AfterCompletion()
    {
        // Arrange
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/hook")])
        );

        // Act
        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;

        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        // After completion the workflow is no longer "active".
        var active = await _client.ListActiveWorkflows();
        Assert.Empty(active);
    }

    [Fact]
    public async Task ScheduledWorkflow_StartsAfterStartAt()
    {
        // Arrange
        await using var context = fixture.GetDbContext();
        var startAt = DateTimeOffset.UtcNow.AddSeconds(3);
        var request = _testHelpers.CreateEnqueueRequest(
            new WorkflowRequest
            {
                Ref = "wf",
                OperationId = $"op-{Guid.NewGuid()}",
                StartAt = startAt,
                Steps = [_testHelpers.CreateWebhookStep("/scheduled")],
            }
        );

        // Act
        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var enqueuedFromApi = await PollUntilFound(
            async () => await _client.ListWorkflows([PersistentItemStatus.Enqueued]),
            workflowId,
            wf => wf.DatabaseId
        );
        var scheduledFromDb = await PollUntilFound(
            async () =>
                await context
                    .GetScheduledWorkflows()
                    .Select(wf => wf.ToDomainModel())
                    .ToListAsync(TestContext.Current.CancellationToken),
            workflowId,
            wf => wf.DatabaseId
        );

        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        // Assert
        await _testHelpers.AssertDbWorkflowCount(1);

        Assert.Single(enqueuedFromApi);
        Assert.Equal(workflowId, enqueuedFromApi[0].DatabaseId);
        Assert.Equal(workflowId, scheduledFromDb.Single().DatabaseId);

        var logs = fixture.WireMock.LogEntries;
        Assert.Single(logs);
        Assert.Contains("/scheduled", logs[0].RequestMessage.AbsolutePath, StringComparison.OrdinalIgnoreCase);
    }

    private static async Task<List<T>> PollUntilFound<T>(
        Func<Task<List<T>>> getWorkflows,
        Guid workflowId,
        Func<T, Guid> getDatabaseId
    )
    {
        while (!TestContext.Current.CancellationToken.IsCancellationRequested)
        {
            List<T> workflows = await getWorkflows();
            if (workflows.Any(wf => getDatabaseId(wf) == workflowId))
            {
                return workflows;
            }

            await Task.Delay(100, TestContext.Current.CancellationToken);
        }

        TestContext.Current.CancellationToken.ThrowIfCancellationRequested();
        throw new InvalidOperationException("Cancellation should have thrown.");
    }
}
