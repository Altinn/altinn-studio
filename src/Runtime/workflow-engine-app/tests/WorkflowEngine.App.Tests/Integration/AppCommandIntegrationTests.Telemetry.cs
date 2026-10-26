using System.Diagnostics;
using WorkflowEngine.App.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.App.Tests.Integration;

public sealed partial class AppCommandIntegrationTests
{
    // ── Domain attributes on spans ────────────────────────────────────────────

    [Fact]
    public async Task Telemetry_AppCommandStep_StepAndWorkflowSpansNameTheInstance()
    {
        using var collector = new TelemetryCollector();
        var step = AppTestHelpers.CreateAppCommandStep("/telemetry-app");
        var request = AppTestHelpers.CreateEnqueueRequest(_testHelpers.CreateWorkflow("wf", [step]));

        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        var (handle, processStep) = await WorkflowSpans(collector, workflowId);
        foreach (var span in new[] { handle, processStep })
        {
            Assert.Equal(EngineAppFixture.DefaultOrg, span.GetTagItem("altinn.service_owner"));
            Assert.Equal(EngineAppFixture.DefaultApp, span.GetTagItem("altinn.app"));
            Assert.Equal("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", span.GetTagItem("altinn.instance.guid"));
            Assert.DoesNotContain(span.TagObjects, t => t.Value?.ToString() == EngineAppFixture.DefaultPartyId);
        }

        Assert.Equal("/telemetry-app", processStep.GetTagItem("altinn.workflow_engine.step.operation_id"));
    }

    [Fact]
    public async Task Telemetry_WebhookStepUnderAnAppContext_SpansCarryNoInstanceAttributes()
    {
        // The context names an instance, but only a command can read it: the engine core never parses it
        using var collector = new TelemetryCollector();
        var step = _testHelpers.CreateWebhookStep("/telemetry-webhook");
        var request = AppTestHelpers.CreateEnqueueRequest(_testHelpers.CreateWorkflow("wf", [step]));

        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        var (handle, processStep) = await WorkflowSpans(collector, workflowId);
        foreach (var span in new[] { handle, processStep })
        {
            Assert.Null(span.GetTagItem("altinn.service_owner"));
            Assert.Null(span.GetTagItem("altinn.app"));
            Assert.Null(span.GetTagItem("altinn.instance.guid"));
        }
    }

    /// <summary>
    /// The workflow's entry span and its single step's span, from the one attempt that ran it.
    /// </summary>
    private static async Task<(Activity Handle, Activity ProcessStep)> WorkflowSpans(
        TelemetryCollector collector,
        Guid workflowId
    )
    {
        var handle = await collector.WaitForActivity(a =>
            a.OperationName == "WorkflowHandler.Handle"
            && a.GetTagItem("altinn.workflow_engine.workflow.id") is Guid id
            && id == workflowId
        );
        var processStep = Assert.Single(
            collector.GetActivities("WorkflowHandler.ProcessStep"),
            a => a.TraceId == handle.TraceId
        );

        return (handle, processStep);
    }
}
