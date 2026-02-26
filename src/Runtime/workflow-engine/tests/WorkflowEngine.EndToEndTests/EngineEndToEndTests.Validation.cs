using System.Net;
using System.Net.Http.Json;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.EndToEndTests.Fixtures;
using WorkflowEngine.Models;

namespace WorkflowEngine.EndToEndTests;

public partial class EngineEndToEndTests
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
                    Type = WorkflowType.AppProcessChange,
                    Steps = [new StepRequest { Command = new Command.AppCommand("do-something") }],
                },
            ],
        };

        // Act
        using var response = await _client.EnqueueRaw(Org, App, PartyId, _instanceGuid, request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await AssertDbEmpty();
    }

    [Fact]
    public async Task NoApiKey_Returns401()
    {
        // Arrange
        using var unauthenticatedClient = fixture.CreateEngineClient();
        unauthenticatedClient.DefaultRequestHeaders.Remove("X-API-Key");

        var request = CreateEnqueueRequest(CreateWorkflow("wf", WorkflowType.Generic, [CreateWebhookStep("/ping-1")]));

        // Act
        using var response = await unauthenticatedClient.PostAsJsonAsync(
            $"{EngineAppFixture.ApiBasePath}/{Org}/{App}/{PartyId}/{_instanceGuid}",
            request,
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        await AssertDbEmpty();
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

        var requestA = CreateEnqueueRequest(
            CreateWorkflow("wf-a", WorkflowType.AppProcessChange, [CreateWebhookStep("/slow")]),
            lockToken: LockToken
        );
        var requestB = CreateEnqueueRequest(
            CreateWorkflow("wf-b", WorkflowType.AppProcessChange, [CreateWebhookStep("/quick")]),
            lockToken: LockToken
        );

        // Act
        var responseA = await _client.Enqueue(Org, App, PartyId, _instanceGuid, requestA);
        var responseB = await _client.EnqueueRaw(Org, App, PartyId, _instanceGuid, requestB);

        var workflowAId = responseA.Workflows.Values.Single();
        await WaitForWorkflowStatus(workflowAId, PersistentItemStatus.Completed);

        // Assert
        Assert.Equal(HttpStatusCode.Conflict, responseB.StatusCode);
        await AssertDbWorkflowCount(1);
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

        var workflowA = CreateWorkflow("wf-a", WorkflowType.AppProcessChange, [CreateWebhookStep("/slow")]);
        var workflowB = CreateWorkflow("wf-b", WorkflowType.AppProcessChange, [CreateWebhookStep("/quick")]);

        // Act
        var responseA = await _client.Enqueue(Org, App, PartyId, _instanceGuid, CreateEnqueueRequest(workflowA));
        var workflowAId = responseA.Workflows.Values.Single();
        await WaitForWorkflowStatus(workflowAId, PersistentItemStatus.Processing);

        var responseB = await _client.Enqueue(
            Org,
            App,
            PartyId,
            _instanceGuid,
            CreateEnqueueRequest(workflowB with { DependsOn = [workflowAId] })
        );
        var workflowBId = responseB.Workflows.Values.Single();

        var statuses = await WaitForWorkflowStatus([workflowAId, workflowBId], PersistentItemStatus.Completed);

        // Assert
        Assert.Equal(2, statuses.Count);
        Assert.All(statuses, status => Assert.Equal(PersistentItemStatus.Completed, status.OverallStatus));
        await AssertDbWorkflowCount(2);
    }

    [Fact]
    public async Task ConcurrencyConstraint_DependentMultipleProcessChange_Staggered_Simultaneous_RejectedWith409()
    {
        // Arrange
        var workflowA = CreateWorkflow("wf-a", WorkflowType.AppProcessChange, [CreateWebhookStep("/something")]);
        var workflowB = CreateWorkflow(
            "wf-b",
            WorkflowType.AppProcessChange,
            [CreateWebhookStep("/something-else")],
            dependsOn: [workflowA.Ref]
        );
        var request = CreateEnqueueRequest([workflowA, workflowB]);

        // Act
        using var response = await _client.EnqueueRaw(Org, App, PartyId, _instanceGuid, request);

        // Assert
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        await AssertDbEmpty();
    }
}
