using WorkflowEngine.App.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

// CA1305: Specify IFormatProvider
#pragma warning disable CA1305

// CA1816: call GC.SuppressFinalize(object)
#pragma warning disable CA1816

namespace WorkflowEngine.App.Tests.Integration;

/// <summary>
/// Integration tests for broader workflow scenarios: DAGs, mixed command types, multi-workflow batches.
/// </summary>
[Collection(AppTestCollection.Name)]
public sealed class WorkflowEnqueueTests(AppTestFixture fixture) : IAsyncLifetime
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
    public async Task ComplexDag_RawJson_AllWorkflowsComplete()
    {
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
                "namespace": "{{EngineAppFixture.DefaultOrg}}:{{EngineAppFixture.DefaultApp}}",
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
                        "steps": [{ "operationId": "process-root", "command": { "type": "app", "data": { "commandKey": "process-root" } } }]
                    },
                    {
                        "ref": "wf-a-first",
                        "operationId": "process-a-1",
                        "dependsOn": ["wf-root"],
                        "steps": [{ "operationId": "process-a-1", "command": { "type": "app", "data": { "commandKey": "process-a-1" } } }]
                    },
                    {
                        "ref": "wf-a-second",
                        "operationId": "process-a-2",
                        "dependsOn": ["wf-a-first"],
                        "steps": [{ "operationId": "process-a-2", "command": { "type": "app", "data": { "commandKey": "process-a-2" } } }]
                    },
                    {
                        "ref": "wf-a-third",
                        "operationId": "process-a-3",
                        "dependsOn": ["wf-a-second"],
                        "steps": [{ "operationId": "process-a-3", "command": { "type": "app", "data": { "commandKey": "process-a-3" } } }]
                    },
                    {
                        "ref": "wf-b-first",
                        "operationId": "process-b-1",
                        "dependsOn": ["wf-root"],
                        "steps": [{ "operationId": "process-b-1", "command": { "type": "app", "data": { "commandKey": "process-b-1" } } }]
                    },
                    {
                        "ref": "wf-c-first",
                        "operationId": "process-c-1",
                        "dependsOn": ["wf-root"],
                        "steps": [{ "operationId": "process-c-1", "command": { "type": "app", "data": { "commandKey": "process-c-1" } } }]
                    },
                    {
                        "ref": "wf-join-b-c",
                        "operationId": "join-b-c",
                        "dependsOn": ["wf-b-first", "wf-c-first"],
                        "steps": [{ "operationId": "join-b-c", "command": { "type": "app", "data": { "commandKey": "join-b-c" } } }]
                    },
                    {
                        "ref": "wf-join-all",
                        "operationId": "join-all",
                        "dependsOn": ["wf-a-third", "wf-join-b-c"],
                        "steps": [{ "operationId": "join-all", "command": { "type": "app", "data": { "commandKey": "join-all" } } }]
                    }
                ]
            }
            """;

        var response = await _client.Enqueue(request);

        Assert.Equal(8, response.Workflows.Count);
        var allIds = response.Workflows.Select(w => w.DatabaseId);
        var statuses = await _client.WaitForWorkflowStatus(allIds, PersistentItemStatus.Completed);

        Assert.All(statuses, s => Assert.Equal(PersistentItemStatus.Completed, s.OverallStatus));
    }

    [Fact]
    public async Task MixedCommandTypes_AppAndWebhook_AllComplete()
    {
        var appStep = _testHelpers.CreateAppCommandStep("/mixed-app-step");
        var webhookStep = _testHelpers.CreateWebhookStep("/mixed-webhook-step");

        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [appStep, webhookStep]),
            lockToken: InstanceLockToken
        );

        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        Assert.Equal(PersistentItemStatus.Completed, status.OverallStatus);
        Assert.Equal(2, status.Steps.Count);
        Assert.All(status.Steps, s => Assert.Equal(PersistentItemStatus.Completed, s.Status));
    }

    [Fact]
    public async Task MultipleWorkflows_NoDependencies_AllComplete()
    {
        var wf1 = _testHelpers.CreateWorkflow("wf-1", [_testHelpers.CreateAppCommandStep("/multi-1")]);
        var wf2 = _testHelpers.CreateWorkflow("wf-2", [_testHelpers.CreateAppCommandStep("/multi-2")]);
        var wf3 = _testHelpers.CreateWorkflow("wf-3", [_testHelpers.CreateAppCommandStep("/multi-3")]);

        var request = _testHelpers.CreateEnqueueRequest([wf1, wf2, wf3], lockToken: InstanceLockToken);

        var response = await _client.Enqueue(request);
        Assert.Equal(3, response.Workflows.Count);

        var allIds = response.Workflows.Select(w => w.DatabaseId);
        var statuses = await _client.WaitForWorkflowStatus(allIds, PersistentItemStatus.Completed);

        Assert.All(statuses, s => Assert.Equal(PersistentItemStatus.Completed, s.OverallStatus));
    }
}
