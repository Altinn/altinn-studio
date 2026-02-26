using System.Net;
using Microsoft.EntityFrameworkCore;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;

namespace WorkflowEngine.EndToEndTests;

public partial class EngineEndToEndTests
{
    [Fact]
    public async Task GetWorkflow_AfterCompletion_ReturnsFullDetails()
    {
        // Arrange
        var request = CreateEnqueueRequest(CreateWorkflow("wf", WorkflowType.Generic, [CreateWebhookStep("/hook")]));

        // Act
        var response = await _client.Enqueue(Org, App, PartyId, _instanceGuid, request);
        var workflowId = response.Workflows.Values.Single();
        await WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        var workflow = await _client.GetWorkflow(Org, App, PartyId, _instanceGuid, workflowId);

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
        var request = CreateEnqueueRequest(CreateWorkflow("wf", WorkflowType.Generic, [CreateWebhookStep("/hook")]));

        // Act
        var response = await _client.Enqueue(Org, App, PartyId, _instanceGuid, request);
        var workflowId = response.Workflows.Values.Single();
        await WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        var resultForCorrectInstance = await _client.GetWorkflowRaw(Org, App, PartyId, _instanceGuid, workflowId);
        var resultForIncorrectInstance = await _client.GetWorkflowRaw(Org, App, PartyId, Guid.NewGuid(), workflowId);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, resultForIncorrectInstance.StatusCode);
        Assert.Equal(HttpStatusCode.OK, resultForCorrectInstance.StatusCode);

        await AssertDbWorkflowCount(1);

        var parsedResult = await _client.AssertSuccessAndDeserialize<WorkflowStatusResponse>(resultForCorrectInstance);
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

        var request = CreateEnqueueRequest(
            CreateWorkflow("wf", WorkflowType.Generic, [CreateWebhookStep("/slow-list")])
        );

        // Act
        var response = await _client.Enqueue(Org, App, PartyId, _instanceGuid, request);
        var workflowId = response.Workflows.Values.Single();

        // Poll until the engine picks up the workflow (Enqueued or Processing).
        var deadline = DateTimeOffset.UtcNow.AddSeconds(10);
        List<WorkflowStatusResponse> active;
        do
        {
            active = await _client.ListActiveWorkflows(Org, App, PartyId, _instanceGuid);
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
        var request = CreateEnqueueRequest(CreateWorkflow("wf", WorkflowType.Generic, [CreateWebhookStep("/hook")]));

        // Act
        var response = await _client.Enqueue(Org, App, PartyId, _instanceGuid, request);
        var workflowId = response.Workflows.Values.Single();

        await WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        // After completion the workflow is no longer "active".
        var active = await _client.ListActiveWorkflows(Org, App, PartyId, _instanceGuid);
        Assert.Empty(active);
    }

    [Fact]
    public async Task ScheduledWorkflow_StartsAfterStartAt()
    {
        // Arrange
        await using var context = fixture.GetDbContext();
        var startAt = DateTimeOffset.UtcNow.AddSeconds(3);
        var request = CreateEnqueueRequest(
            new WorkflowRequest
            {
                Ref = "wf",
                OperationId = $"op-{Guid.NewGuid()}",
                Type = WorkflowType.Generic,
                StartAt = startAt,
                Steps = [CreateWebhookStep("/scheduled")],
            }
        );

        // Act
        var response = await _client.Enqueue(Org, App, PartyId, _instanceGuid, request);
        var workflowId = response.Workflows.Values.Single();
        var activeFromApi = await _client.ListActiveWorkflows(Org, App, PartyId, _instanceGuid);
        var scheduledFromDb = await context.GetScheduledWorkflows().ToListAsync(TestContext.Current.CancellationToken);

        await WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        // Assert
        await AssertDbWorkflowCount(1);

        Assert.Empty(activeFromApi);
        Assert.Equal(workflowId, scheduledFromDb.Single().Id);

        var logs = fixture.WireMock.LogEntries;
        Assert.Single(logs);
        Assert.Contains("/scheduled", logs[0].RequestMessage.AbsolutePath, StringComparison.OrdinalIgnoreCase);
    }
}
