using System.Net;
using System.Text.Json;
using WorkflowEngine.App.Commands.AppCommand;
using WorkflowEngine.App.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

// CA1305: Specify IFormatProvider
#pragma warning disable CA1305
// CA1816: call GC.SuppressFinalize(object)
#pragma warning disable CA1816

namespace WorkflowEngine.App.Tests.Integration;

/// <summary>
/// Integration tests for the AppCommand handler.
/// Spins up the full ASP.NET Core application with AppCommand registered,
/// backed by a real PostgreSQL container and WireMock as the callback receiver.
/// </summary>
[Collection(AppTestCollection.Name)]
public sealed partial class AppCommandIntegrationTests(AppTestFixture fixture) : IAsyncLifetime
{
    private readonly EngineApiClient _client = new(fixture);
    private readonly AppTestHelpers _testHelpers = new(fixture);

    private const string InstanceLockToken = AppTestFixture.DefaultInstanceLockToken;

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
    public async Task AppCommand_UsesCorrectMethod()
    {
        var step = _testHelpers.CreateAppCommandStep("/app-command-callback");
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [step]),
            lockToken: InstanceLockToken
        );

        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        Assert.Single(status.Steps);
        Assert.Equal(PersistentItemStatus.Completed, status.OverallStatus);
        Assert.Equal(PersistentItemStatus.Completed, status.Steps[0].Status);

        var logs = fixture.WireMock.LogEntries;
        Assert.Single(logs);
        Assert.Equal("POST", logs[0].RequestMessage.Method, ignoreCase: true);
        Assert.Contains(
            "/app-command-callback",
            logs[0].RequestMessage.AbsolutePath,
            StringComparison.OrdinalIgnoreCase
        );
    }

    [Theory]
    [InlineData(1)]
    [InlineData(3)]
    [InlineData(5)]
    public async Task AppCommand_AllStepsComplete_InOrder(int numSteps)
    {
        var stubs = Enumerable.Range(1, numSteps).Select(i => $"/app-{i}").ToList();
        var steps = stubs.Select(x => _testHelpers.CreateAppCommandStep(x)).ToList();
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", steps),
            lockToken: InstanceLockToken
        );

        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        Assert.Equal(PersistentItemStatus.Completed, status.OverallStatus);
        Assert.Equal(numSteps, status.Steps.Count);
        Assert.All(status.Steps, s => Assert.Equal(PersistentItemStatus.Completed, s.Status));
    }

    [Fact]
    public async Task AppCommand_WithoutLockToken_ReturnsBadRequest()
    {
        var request = new WorkflowEnqueueRequest
        {
            Namespace = $"{EngineAppFixture.DefaultOrg}:{EngineAppFixture.DefaultApp}",
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
                            OperationId = "do-something",
                            Command = App.Commands.AppCommand.AppCommand.Create(
                                new AppCommandData { CommandKey = "do-something" }
                            ),
                        },
                    ],
                },
            ],
        };

        using var response = await _client.EnqueueRaw(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AppCommand_CallbackPayload_IsCorrect()
    {
        var step = _testHelpers.CreateAppCommandStep("/verify-payload", payload: "custom-payload");
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [step]),
            lockToken: InstanceLockToken
        );

        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        var logs = fixture.WireMock.LogEntries;
        Assert.Single(logs);

        var body = logs[0].RequestMessage.Body;
        Assert.NotNull(body);

        var payload = JsonSerializer.Deserialize<AppCallbackPayload>(body);
        Assert.NotNull(payload);
        Assert.Equal("/verify-payload", payload.CommandKey);
        Assert.Equal(InstanceLockToken, payload.LockToken);
        Assert.Equal("custom-payload", payload.Payload);
        Assert.NotEqual(Guid.Empty, payload.WorkflowId);
        Assert.NotNull(payload.Actor);
        Assert.Equal("test-user", payload.Actor.UserIdOrOrgNumber);
    }

    [Fact]
    public async Task AppCommand_IdempotentResubmit_DoesNotDuplicate()
    {
        var step = _testHelpers.CreateAppCommandStep("/idempotent-test");
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [step]),
            lockToken: InstanceLockToken
        );

        // Submit the same request twice (same idempotency key)
        var response1 = await _client.Enqueue(request);
        var response2 = await _client.Enqueue(request);

        // Both should return the same workflow ID
        Assert.Equal(response1.Workflows.Single().DatabaseId, response2.Workflows.Single().DatabaseId);
    }
}
