using Microsoft.Extensions.DependencyInjection;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.Api;
using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

[Collection(EngineShutdownCollection.Name)]
public sealed class EngineStatusTests(EngineAppFixture<Program> fixture) : IAsyncLifetime
{
    private readonly EngineApiClient _client = new(fixture);
    private readonly TestHelpers _testHelpers = new(fixture);

    public async ValueTask InitializeAsync()
    {
        await fixture.ResetAsync();
        await _testHelpers.AssertDbEmpty();
        await Task.Delay(50);
    }

    public async ValueTask DisposeAsync()
    {
        _client.Dispose();
        await Task.Delay(50);
    }

    [Fact]
    public void Status_WhenProcessorIsRunning_ReportsRunningAndHealthy()
    {
        // Arrange
        var status = fixture.Services.GetRequiredService<IEngineStatus>();

        // Act & Assert
        Assert.True(status.Status.HasFlag(EngineHealthStatus.Running));
        Assert.True(status.Status.HasFlag(EngineHealthStatus.Healthy));
        Assert.False(status.Status.HasFlag(EngineHealthStatus.Stopped));
    }

    [Fact]
    public void MaxWorkers_ReturnsConfiguredValue()
    {
        // Arrange
        var status = fixture.Services.GetRequiredService<IEngineStatus>();

        // Act & Assert
        Assert.True(status.MaxWorkers > 0);
    }

    [Fact]
    public async Task ActiveWorkerCount_IncreasesWhenProcessingWorkflows()
    {
        // Arrange — configure WireMock with a delay so the workflow stays in-flight long enough to observe
        fixture.WireMock.Reset();
        fixture
            .WireMock.Given(Request.Create().WithPath("/slow-status").UsingAnyMethod())
            .RespondWith(Response.Create().WithStatusCode(200).WithDelay(TimeSpan.FromSeconds(3)));
        fixture.SetupDefaultStub();

        var status = fixture.Services.GetRequiredService<IEngineStatus>();
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/slow-status")])
        );

        // Act
        var enqueueResponse = await _client.Enqueue(request);
        var workflowId = enqueueResponse.Workflows.Single().DatabaseId;

        // Wait until the engine picks up the workflow (active workers > 0)
        var deadline = DateTimeOffset.UtcNow.AddSeconds(10);
        var sawActiveWorker = false;
        while (DateTimeOffset.UtcNow < deadline)
        {
            if (status.ActiveWorkerCount > 0)
            {
                sawActiveWorker = true;
                break;
            }

            await Task.Delay(50, TestContext.Current.CancellationToken);
        }

        // Assert
        Assert.True(sawActiveWorker, "Expected ActiveWorkerCount > 0 while processing a workflow");

        // Cleanup — wait for the workflow to finish
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);
    }

    [Fact]
    public async Task RecentWorkflows_ContainsCompletedWorkflow()
    {
        // Arrange
        var status = fixture.Services.GetRequiredService<IEngineStatus>();
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/recent-hook")])
        );

        // Act
        var enqueueResponse = await _client.Enqueue(request);
        var workflowId = enqueueResponse.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        // Assert — the completed workflow should appear in the recent cache
        var recent = status.GetRecentWorkflows(10);
        Assert.NotEmpty(recent);
        Assert.Contains(recent, wf => wf.OperationId == "op-wf");
    }
}
