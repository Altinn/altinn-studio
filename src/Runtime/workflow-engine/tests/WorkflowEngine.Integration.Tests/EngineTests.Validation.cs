using System.Net;
using System.Net.Http.Json;
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
            IdempotencyKey = $"idem-{Guid.NewGuid()}",
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
}
