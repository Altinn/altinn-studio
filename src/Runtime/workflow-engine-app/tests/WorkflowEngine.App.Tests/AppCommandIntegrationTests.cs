using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using WorkflowEngine.App.Commands.AppCommand;
using WorkflowEngine.App.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

// CA1305: Specify IFormatProvider
#pragma warning disable CA1305

namespace WorkflowEngine.App.Tests;

/// <summary>
/// Integration tests for the AppCommand handler.
/// Spins up the full ASP.NET Core application with AppCommand registered,
/// backed by a real PostgreSQL container and WireMock as the callback receiver.
/// </summary>
[Collection(AppTestCollection.Name)]
public sealed class AppCommandIntegrationTests(AppTestFixture fixture) : IAsyncLifetime
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

    // CA1816: call GC.SuppressFinalize(object)
#pragma warning disable CA1816
    public async ValueTask DisposeAsync()
    {
        _client.Dispose();
        await Task.Delay(50);
    }
#pragma warning restore CA1816

    [Fact]
    public async Task AppCommand_UsesCorrectMethod()
    {
        // Arrange
        var step = _testHelpers.CreateAppCommandStep("/app-command-callback");
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [step]),
            lockToken: InstanceLockToken
        );

        // Act
        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        // Assert
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
        // Arrange
        var stubs = Enumerable.Range(1, numSteps).Select(i => $"/app-{i}").ToList();
        var steps = stubs.Select(x => _testHelpers.CreateAppCommandStep(x)).ToList();
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", steps),
            lockToken: InstanceLockToken
        );

        // Act
        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        // Assert
        Assert.Equal(PersistentItemStatus.Completed, status.OverallStatus);
        Assert.Equal(numSteps, status.Steps.Count);
        Assert.All(status.Steps, s => Assert.Equal(PersistentItemStatus.Completed, s.Status));
    }

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
    public async Task ComplexDag_RawJson_AllWorkflowsComplete()
    {
        // Arrange
        /*
                                      [wf-root]
                                          |
                  ┌───────────────────────┼───────────────────────┐
                  |                       |                       |
            [wf-a-first]            [wf-b-first]            [wf-c-first]
                  |                       |                       |
            [wf-a-second]                 └───────────┬───────────┘
                  |                                   |
            [wf-a-third]                        [wf-join-b-c]
                  |                                   |
                  └──────────────────┬────────────────┘
                                     |
                               [wf-join-all]
         */

        const string request = $$"""
            {
                "tenantId": "{{EngineAppFixture.DefaultOrg}}:{{EngineAppFixture.DefaultApp}}",
                "idempotencyKey": "complex-dag-raw-json",
                "labels": { "org": "{{EngineAppFixture.DefaultOrg}}", "app": "{{EngineAppFixture.DefaultApp}}" },
                "context": {
                    "actor": { "userIdOrOrgNumber": "{{EngineAppFixture.DefaultPartyId}}", "language": "nb" },
                    "lockToken": "{{AppTestFixture.DefaultInstanceLockToken}}",
                    "org": "{{EngineAppFixture.DefaultOrg}}",
                    "app": "{{EngineAppFixture.DefaultApp}}",
                    "instanceOwnerPartyId": {{EngineAppFixture.DefaultPartyId}},
                    "instanceGuid": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
                },
                "workflows": [
                    {
                        "ref": "wf-root",
                        "operationId": "process-root",
                        "steps": [{ "command": { "type": "app", "operationId": "process-root", "data": { "commandKey": "process-root" } } }]
                    },
                    {
                        "ref": "wf-a-first",
                        "operationId": "process-a-1",
                        "dependsOn": ["wf-root"],
                        "steps": [{ "command": { "type": "app", "operationId": "process-a-1", "data": { "commandKey": "process-a-1" } } }]
                    },
                    {
                        "ref": "wf-a-second",
                        "operationId": "process-a-2",
                        "dependsOn": ["wf-a-first"],
                        "steps": [{ "command": { "type": "app", "operationId": "process-a-2", "data": { "commandKey": "process-a-2" } } }]
                    },
                    {
                        "ref": "wf-a-third",
                        "operationId": "process-a-3",
                        "dependsOn": ["wf-a-second"],
                        "steps": [{ "command": { "type": "app", "operationId": "process-a-3", "data": { "commandKey": "process-a-3" } } }]
                    },
                    {
                        "ref": "wf-b-first",
                        "operationId": "process-b-1",
                        "dependsOn": ["wf-root"],
                        "steps": [{ "command": { "type": "app", "operationId": "process-b-1", "data": { "commandKey": "process-b-1" } } }]
                    },
                    {
                        "ref": "wf-c-first",
                        "operationId": "process-c-1",
                        "dependsOn": ["wf-root"],
                        "steps": [{ "command": { "type": "app", "operationId": "process-c-1", "data": { "commandKey": "process-c-1" } } }]
                    },
                    {
                        "ref": "wf-join-b-c",
                        "operationId": "join-b-c",
                        "dependsOn": ["wf-b-first", "wf-c-first"],
                        "steps": [{ "command": { "type": "app", "operationId": "join-b-c", "data": { "commandKey": "join-b-c" } } }]
                    },
                    {
                        "ref": "wf-join-all",
                        "operationId": "join-all",
                        "dependsOn": ["wf-a-third", "wf-join-b-c"],
                        "steps": [{ "command": { "type": "app", "operationId": "join-all", "data": { "commandKey": "join-all" } } }]
                    }
                ]
            }
            """;

        // Act
        var response = await _client.Enqueue(request);

        // Assert
        Assert.Equal(8, response.Workflows.Count);
        var allIds = response.Workflows.Select(w => w.DatabaseId);
        var statuses = await _client.WaitForWorkflowStatus(allIds, PersistentItemStatus.Completed);

        Assert.All(statuses, s => Assert.Equal(PersistentItemStatus.Completed, s.OverallStatus));
    }
}
