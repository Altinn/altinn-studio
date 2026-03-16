using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.Models;

namespace WorkflowEngine.Integration.Tests;

public partial class EngineTests
{
    [Fact]
    public async Task Webhook_Returns500_WorkflowRetriesAndEventuallyFails()
    {
        // Arrange – WireMock always returns 500
        fixture.WireMock.Reset();
        fixture.WireMock.Given(Request.Create().UsingAnyMethod()).RespondWith(Response.Create().WithStatusCode(500));

        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/always-500")])
        );

        // Act
        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Failed);

        // Assert — engine is configured with 3 retries (Constant, 100ms)
        Assert.Equal(PersistentItemStatus.Failed, status.OverallStatus);
        Assert.Equal(PersistentItemStatus.Failed, status.Steps[0].Status);
        Assert.Equal(3, status.Steps[0].RetryCount);
    }

    [Fact]
    public async Task Webhook_Returns500ThenSuccess_WorkflowCompletes()
    {
        // Arrange – WireMock returns 500 twice, then 200
        fixture
            .WireMock.Given(Request.Create().UsingAnyMethod())
            .InScenario("flaky")
            .WillSetStateTo("failed-1")
            .RespondWith(Response.Create().WithStatusCode(500));
        fixture
            .WireMock.Given(Request.Create().UsingAnyMethod())
            .InScenario("flaky")
            .WhenStateIs("failed-1")
            .WillSetStateTo("failed-2")
            .RespondWith(Response.Create().WithStatusCode(500));
        fixture
            .WireMock.Given(Request.Create().UsingAnyMethod())
            .InScenario("flaky")
            .WhenStateIs("failed-2")
            .RespondWith(Response.Create().WithStatusCode(200));

        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/flaky")])
        );

        // Act
        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        // Assert
        Assert.Equal(PersistentItemStatus.Completed, status.OverallStatus);
        Assert.Equal(PersistentItemStatus.Completed, status.Steps[0].Status);
        Assert.Equal(2, status.Steps[0].RetryCount);
    }

    [Fact]
    public async Task Webhook_Returns400_WorkflowFailsImmediately()
    {
        // Arrange – WireMock returns 400 (non-retryable client error)
        fixture.WireMock.Reset();
        fixture
            .WireMock.Given(Request.Create().UsingAnyMethod())
            .RespondWith(Response.Create().WithStatusCode(400).WithBody("Bad Request"));

        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/bad-request")])
        );

        // Act
        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Failed);

        // Assert — no retries for 400
        Assert.Equal(PersistentItemStatus.Failed, status.OverallStatus);
        Assert.Equal(PersistentItemStatus.Failed, status.Steps[0].Status);
        Assert.Equal(0, status.Steps[0].RetryCount);
    }
}
