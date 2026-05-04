using Microsoft.EntityFrameworkCore;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;

namespace WorkflowEngine.Integration.Tests;

public partial class EngineTests
{
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
