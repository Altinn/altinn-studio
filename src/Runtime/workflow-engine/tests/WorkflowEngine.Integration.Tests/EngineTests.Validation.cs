using System.Net;
using System.Net.Http.Json;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Models;

namespace WorkflowEngine.Integration.Tests;

public partial class EngineTests
{
    [Fact]
    public async Task AppCommand_WithoutLockToken_Returns400_AndNothingEnqueued()
    {
        // Arrange
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

        // Act
        using var response = await _client.EnqueueRaw(_instanceGuid, request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await _testHelpers.AssertDbEmpty();
    }

    [Fact]
    public async Task NoApiKey_Returns401()
    {
        // Arrange
        using var unauthenticatedClient = fixture.CreateEngineClient();
        unauthenticatedClient.DefaultRequestHeaders.Remove("X-API-Key");

        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", WorkflowType.Generic, [_testHelpers.CreateWebhookStep("/ping-1")])
        );

        // Act
        using var response = await unauthenticatedClient.PostAsJsonAsync(
            EngineApiClient.GetInstancePath(_instanceGuid),
            request,
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        await _testHelpers.AssertDbEmpty();
    }

    [Fact]
    public async Task ConcurrencyConstraint_IndependentMultipleAppProcessChange_RejectedWith409()
    {
        // Arrange
        // WireMock delays /slow endpoint so A stays in Processing long enough for B's constraint check to see it.
        fixture.WireMock.Reset();
        fixture
            .WireMock.Given(Request.Create().WithPath("/slow").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200).WithDelay(TimeSpan.FromSeconds(5)));
        fixture.SetupDefaultStub();

        var requestA = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow(
                "wf-a",
                WorkflowType.AppProcessChange,
                [_testHelpers.CreateWebhookStep("/slow")]
            ),
            lockToken: InstanceLockToken
        );
        var requestB = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow(
                "wf-b",
                WorkflowType.AppProcessChange,
                [_testHelpers.CreateWebhookStep("/quick")]
            ),
            lockToken: InstanceLockToken
        );

        // Act
        var responseA = await _client.Enqueue(_instanceGuid, requestA);
        var responseB = await _client.EnqueueRaw(_instanceGuid, requestB);

        var workflowAId = responseA.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(_instanceGuid, workflowAId, PersistentItemStatus.Completed);

        // Assert
        Assert.Equal(HttpStatusCode.Conflict, responseB.StatusCode);
        await _testHelpers.AssertDbWorkflowCount(1);
    }

    [Fact]
    public async Task ConcurrencyConstraint_DependentMultipleProcessChange_Staggered_Accepted()
    {
        // Arrange
        // WireMock delays /slow endpoint so A stays in Processing long enough for B's constraint check to see it.
        fixture.WireMock.Reset();
        fixture
            .WireMock.Given(Request.Create().WithPath("/slow").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200).WithDelay(TimeSpan.FromSeconds(1)));
        fixture.SetupDefaultStub();

        var workflowA = _testHelpers.CreateWorkflow(
            "wf-a",
            WorkflowType.AppProcessChange,
            [_testHelpers.CreateWebhookStep("/slow")]
        );
        var workflowB = _testHelpers.CreateWorkflow(
            "wf-b",
            WorkflowType.AppProcessChange,
            [_testHelpers.CreateWebhookStep("/quick")]
        );

        // Act
        var responseA = await _client.Enqueue(_instanceGuid, _testHelpers.CreateEnqueueRequest(workflowA));
        var workflowAId = responseA.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(_instanceGuid, workflowAId, PersistentItemStatus.Processing);

        var responseB = await _client.Enqueue(
            _instanceGuid,
            _testHelpers.CreateEnqueueRequest(workflowB with { DependsOn = [workflowAId] })
        );
        var workflowBId = responseB.Workflows.Single().DatabaseId;

        var statuses = await _client.WaitForWorkflowStatus(
            _instanceGuid,
            [workflowAId, workflowBId],
            PersistentItemStatus.Completed
        );

        // Assert
        Assert.Equal(2, statuses.Count);
        Assert.All(statuses, status => Assert.Equal(PersistentItemStatus.Completed, status.OverallStatus));
        await _testHelpers.AssertDbWorkflowCount(2);
    }

    [Fact]
    public async Task ConcurrencyConstraint_DependentMultipleProcessChange_Staggered_Simultaneous_RejectedWith409()
    {
        // Arrange
        var workflowA = _testHelpers.CreateWorkflow(
            "wf-a",
            WorkflowType.AppProcessChange,
            [_testHelpers.CreateWebhookStep("/something")]
        );
        var workflowB = _testHelpers.CreateWorkflow(
            "wf-b",
            WorkflowType.AppProcessChange,
            [_testHelpers.CreateWebhookStep("/something-else")],
            dependsOn: ["wf-a"]
        );
        var request = _testHelpers.CreateEnqueueRequest([workflowA, workflowB]);

        // Act
        using var response = await _client.EnqueueRaw(_instanceGuid, request);

        // Assert
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        await _testHelpers.AssertDbEmpty();
    }
}
