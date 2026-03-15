using System.Net;
using System.Net.Http.Json;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

public partial class EngineTests
{
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
            "/api/v1/workflows",
            request,
            cancellationToken: TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        await _testHelpers.AssertDbEmpty();
    }

    // ── Namespace handling ──────────────────────────────────────────────────

    [Fact]
    public async Task RawJson_WithoutNamespace_DefaultsToDefaultNamespace()
    {
        var port = fixture.WireMock.Port;
        var request = $$"""
            {
                "idempotencyKey": "no-namespace-test",
                "workflows": [
                    {
                        "ref": "wf-no-ns",
                        "operationId": "op-no-ns",
                        "steps": [{ "operationId": "step-no-ns", "command": { "type": "webhook", "data": { "uri": "http://localhost:{{port}}/no-ns" } } }]
                    }
                ]
            }
            """;

        var response = await _client.Enqueue(request);

        await Verify(response);
        Assert.Single(response.Workflows);
        Assert.All(response.Workflows, w => Assert.Equal("default", w.Namespace));
    }

    [Fact]
    public async Task RawJson_WithNamespace_NamespaceParrotedBack()
    {
        var port = fixture.WireMock.Port;
        var request = $$"""
            {
                "namespace": "custom:namespace",
                "idempotencyKey": "with-namespace-test",
                "workflows": [
                    {
                        "ref": "wf-with-ns",
                        "operationId": "op-with-ns",
                        "steps": [{ "operationId": "step-with-ns", "command": { "type": "webhook", "data": { "uri": "http://localhost:{{port}}/with-ns" } } }]
                    }
                ]
            }
            """;

        var response = await _client.Enqueue(request);

        await Verify(response);
        Assert.Single(response.Workflows);
        Assert.All(response.Workflows, w => Assert.Equal("custom:namespace", w.Namespace));
    }

    // ── Step validation ─────────────────────────────────────────────────────

    [Fact]
    public async Task RawJson_MissingStepOperationId_Returns400()
    {
        var port = fixture.WireMock.Port;
        var request = $$"""
            {
                "namespace": "{{EngineAppFixture.DefaultOrg}}:{{EngineAppFixture.DefaultApp}}",
                "idempotencyKey": "missing-step-opid-test",
                "workflows": [
                    {
                        "ref": "wf-no-step-opid",
                        "operationId": "op-no-step-opid",
                        "steps": [
                            { "command": { "type": "webhook", "data": { "uri": "http://localhost:{{port}}/no-opid" } } }
                        ]
                    }
                ]
            }
            """;

        var ex = await Assert.ThrowsAsync<HttpRequestException>(() => _client.Enqueue(request));
        Assert.Contains("BadRequest", ex.Message);
    }

    [Fact]
    public async Task RawJson_StepsMissingOperationId_MultipleSteps_Returns400()
    {
        // Simulates a common mistake where steps omit the required operationId
        var port = fixture.WireMock.Port;
        var request = $$"""
            {
                "namespace": "{{EngineAppFixture.DefaultOrg}}:{{EngineAppFixture.DefaultApp}}",
                "idempotencyKey": "missing-opid-multi-test",
                "workflows": [
                    {
                        "ref": "wf-bad-steps",
                        "operationId": "op-bad-steps",
                        "steps": [
                            { "command": { "type": "webhook", "data": { "uri": "http://localhost:{{port}}/step-1" } } },
                            { "command": { "type": "webhook", "data": { "uri": "http://localhost:{{port}}/step-2" } } },
                            { "command": { "type": "webhook", "data": { "uri": "http://localhost:{{port}}/step-3" } } }
                        ]
                    }
                ]
            }
            """;

        var ex = await Assert.ThrowsAsync<HttpRequestException>(() => _client.Enqueue(request));
        Assert.Contains("BadRequest", ex.Message);
    }

    // ── Multi-step webhook workflow ─────────────────────────────────────────

    [Fact]
    public async Task RawJson_MultipleWebhookSteps_AllComplete()
    {
        var port = fixture.WireMock.Port;
        var request = $$"""
            {
                "namespace": "{{EngineAppFixture.DefaultOrg}}:{{EngineAppFixture.DefaultApp}}",
                "idempotencyKey": "multi-webhook-steps-test",
                "labels": { "org": "{{EngineAppFixture.DefaultOrg}}", "app": "{{EngineAppFixture.DefaultApp}}" },
                "workflows": [
                    {
                        "ref": "multi-step-wf",
                        "operationId": "multi-step-wf",
                        "steps": [
                            { "operationId": "step-1", "command": { "type": "webhook", "data": { "uri": "http://localhost:{{port}}/step-1" } } },
                            { "operationId": "step-2", "command": { "type": "webhook", "data": { "uri": "http://localhost:{{port}}/step-2" } } },
                            { "operationId": "step-3", "command": { "type": "webhook", "data": { "uri": "http://localhost:{{port}}/step-3" } } },
                            { "operationId": "step-4", "command": { "type": "webhook", "data": { "uri": "http://localhost:{{port}}/step-4" } } },
                            { "operationId": "step-5", "command": { "type": "webhook", "data": { "uri": "http://localhost:{{port}}/step-5" } } }
                        ]
                    }
                ]
            }
            """;

        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        await Verify(response);
        Assert.Equal(PersistentItemStatus.Completed, status.OverallStatus);
        Assert.Equal(5, status.Steps.Count);
        Assert.All(status.Steps, s => Assert.Equal(PersistentItemStatus.Completed, s.Status));
    }
}
