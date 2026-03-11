using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using WorkflowEngine.CommandHandlers.Handlers.AppCommand;
using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Models;

namespace WorkflowEngine.Integration.Tests;

public partial class EngineTests
{
    [Fact]
    public async Task AppCommand_WithoutLockToken_ReturnsBadRequest()
    {
        // Arrange — app commands without lockToken in Context are rejected at validation time
        var request = new WorkflowEnqueueRequest
        {
            TenantId = $"{EngineAppFixture.DefaultOrg}:{EngineAppFixture.DefaultApp}",
            IdempotencyKey = $"idem-{Guid.NewGuid()}",
            Context = JsonSerializer.SerializeToElement(
                new
                {
                    Actor = new Actor { UserIdOrOrgNumber = "test-user" },
                    Org = EngineAppFixture.DefaultOrg,
                    App = EngineAppFixture.DefaultApp,
                    InstanceOwnerPartyId = int.Parse(EngineAppFixture.DefaultPartyId),
                    InstanceGuid = EngineAppFixture.DefaultInstanceGuid,
                }
            ),
            Workflows =
            [
                new WorkflowRequest
                {
                    Ref = "wf",
                    OperationId = $"op-{Guid.NewGuid()}",
                    Steps =
                    [
                        new StepRequest
                        {
                            Command = AppCommand.Create(
                                "do-something",
                                new AppCommandData { CommandKey = "do-something" }
                            ),
                        },
                    ],
                },
            ],
        };

        // Act
        using var response = await _client.EnqueueRaw(request);

        // Assert — validation rejects the request because lockToken is missing
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task NoApiKey_Returns401()
    {
        // Arrange
        using var unauthenticatedClient = fixture.CreateEngineClient();
        unauthenticatedClient.DefaultRequestHeaders.Remove("X-API-Key");

        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/ping-1")])
        );

        // Act
        using var response = await unauthenticatedClient.PostAsJsonAsync(
            EngineApiClient.GetTenantPath(EngineApiClient.DefaultTenantId),
            request,
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        await _testHelpers.AssertDbEmpty();
    }
}
