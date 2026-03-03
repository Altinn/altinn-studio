using System.Net;
using Microsoft.EntityFrameworkCore;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Models;

namespace WorkflowEngine.Integration.Tests;

public partial class EngineTests
{
    [Fact]
    public async Task GetWorkflow_AfterCompletion_ReturnsFullDetails()
    {
        // Arrange
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", WorkflowType.Generic, [_testHelpers.CreateWebhookStep("/hook")])
        );

        // Act
        var response = await _client.Enqueue(_instanceGuid, request);
        var workflowId = response.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(_instanceGuid, workflowId, PersistentItemStatus.Completed);

        var workflow = await _client.GetWorkflow(_instanceGuid, workflowId);

        // Assert
        Assert.NotNull(workflow);
        Assert.Equal(workflowId, workflow.DatabaseId);
        Assert.Equal(PersistentItemStatus.Completed, workflow.OverallStatus);
        Assert.Equal(PersistentItemStatus.Completed, workflow.Steps[0].Status);
        Assert.Equal(WorkflowType.Generic, workflow.Type);
        Assert.NotNull(workflow.UpdatedAt);
        Assert.Single(workflow.Steps);
    }

    [Fact]
    public async Task GetWorkflow_WrongInstance_Returns404()
    {
        // Arrange
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", WorkflowType.Generic, [_testHelpers.CreateWebhookStep("/hook")])
        );

        // Act
        var response = await _client.Enqueue(_instanceGuid, request);
        var workflowId = response.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(_instanceGuid, workflowId, PersistentItemStatus.Completed);

        var resultForCorrectInstance = await _client.GetWorkflowRaw(_instanceGuid, workflowId);
        var resultForIncorrectInstance = await _client.GetWorkflowRaw(Guid.NewGuid(), workflowId);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, resultForIncorrectInstance.StatusCode);
        Assert.Equal(HttpStatusCode.OK, resultForCorrectInstance.StatusCode);

        await _testHelpers.AssertDbWorkflowCount(1);

        var parsedResult = await Fixtures.EngineApiClient.AssertSuccessAndDeserialize<WorkflowStatusResponse>(
            resultForCorrectInstance
        );
        Assert.Equal(workflowId, parsedResult.DatabaseId);
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
            _testHelpers.CreateWorkflow("wf", WorkflowType.Generic, [_testHelpers.CreateWebhookStep("/slow-list")])
        );

        // Act
        var response = await _client.Enqueue(_instanceGuid, request);
        var workflowId = response.Workflows.Single().DatabaseId;

        // Poll until the engine picks up the workflow (Enqueued or Processing).
        var deadline = DateTimeOffset.UtcNow.AddSeconds(10);
        List<WorkflowStatusResponse> active;
        do
        {
            active = await _client.ListActiveWorkflows(_instanceGuid);
            if (active.Count > 0)
                break;
            await Task.Delay(100, TestContext.Current.CancellationToken);
        } while (DateTimeOffset.UtcNow < deadline);

        // Assert
        Assert.NotEmpty(active);
        Assert.Single(active);
        Assert.Equal(workflowId, active[0].DatabaseId);
    }

    [Fact]
    public async Task ListActiveWorkflows_ReturnsNoContent_AfterCompletion()
    {
        // Arrange
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", WorkflowType.Generic, [_testHelpers.CreateWebhookStep("/hook")])
        );

        // Act
        var response = await _client.Enqueue(_instanceGuid, request);
        var workflowId = response.Workflows.Single().DatabaseId;

        await _client.WaitForWorkflowStatus(_instanceGuid, workflowId, PersistentItemStatus.Completed);

        // After completion the workflow is no longer "active".
        var active = await _client.ListActiveWorkflows(_instanceGuid);
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
                IdempotencyKey = $"key-{Guid.NewGuid()}",
                Type = WorkflowType.Generic,
                StartAt = startAt,
                Steps = [_testHelpers.CreateWebhookStep("/scheduled")],
            }
        );

        // Act
        var response = await _client.Enqueue(_instanceGuid, request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var activeFromApi = await _client.ListActiveWorkflows(_instanceGuid);
        var scheduledFromDb = await context.GetScheduledWorkflows().ToListAsync(TestContext.Current.CancellationToken);

        await _client.WaitForWorkflowStatus(_instanceGuid, workflowId, PersistentItemStatus.Completed);

        // Assert
        await _testHelpers.AssertDbWorkflowCount(1);

        Assert.Empty(activeFromApi);
        Assert.Equal(workflowId, scheduledFromDb.Single().Id);

        var logs = fixture.WireMock.LogEntries;
        Assert.Single(logs);
        Assert.Contains("/scheduled", logs[0].RequestMessage.AbsolutePath, StringComparison.OrdinalIgnoreCase);
    }
}
