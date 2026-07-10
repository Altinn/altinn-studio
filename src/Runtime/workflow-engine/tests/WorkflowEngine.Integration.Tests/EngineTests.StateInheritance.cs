using System.Net;
using WorkflowEngine.Models;
using WorkflowEngine.TestApp;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

public partial class EngineTests
{
    // ── State inheritance across a dependency edge ──────────────────────────

    [Fact]
    public async Task StateInheritance_DependentStartsFromSourceFinalState()
    {
        // wf-main starts from its own initial state and produces an evolved state; wf-side
        // depends on it and inherits its final state instead of carrying one of its own.
        string mainProbeId = $"main-{Guid.NewGuid():N}";
        string sideProbeId = $"side-{Guid.NewGuid():N}";
        const string mainInitialState = """{"initial":"main"}""";
        const string mainFinalState = """{"evolved":"by-main"}""";

        var mainWorkflow = _testHelpers.CreateWorkflow(
            "wf-main",
            [
                new StepRequest
                {
                    OperationId = "produce-state",
                    Command = StateProbeCommand.Create(mainProbeId, stateOut: mainFinalState),
                },
            ]
        ) with
        {
            State = mainInitialState,
        };
        var sideWorkflow = _testHelpers.CreateWorkflow(
            "wf-side",
            [new StepRequest { OperationId = "observe-state", Command = StateProbeCommand.Create(sideProbeId) }],
            dependsOn: [(WorkflowRef)"wf-main"]
        ) with
        {
            InheritStateFrom = (WorkflowRef)"wf-main",
            IsHead = false,
        };
        var request = _testHelpers.CreateEnqueueRequest([mainWorkflow, sideWorkflow], includeContext: false);

        var accepted = await _client.Enqueue(request);
        Assert.Equal(2, accepted.Workflows.Count);
        await _client.WaitForWorkflowStatus(
            accepted.Workflows.Select(w => w.DatabaseId),
            PersistentItemStatus.Completed
        );

        // The source ran from its own initial state; the dependent started from the source's
        // final (step-produced) state, not from a state of its own.
        Assert.True(StateProbeCommand.TryGetObservedStateIn(mainProbeId, out string? mainObservedState));
        Assert.Equal(mainInitialState, mainObservedState);
        Assert.True(StateProbeCommand.TryGetObservedStateIn(sideProbeId, out string? sideObservedState));
        Assert.Equal(mainFinalState, sideObservedState);
    }

    [Fact]
    public async Task StateInheritance_SourceWithoutStepState_FallsBackToSourceInitialState()
    {
        // The source's steps never produce state, so its final state is its initial state.
        string sideProbeId = $"side-{Guid.NewGuid():N}";
        const string mainInitialState = """{"only":"initial"}""";

        var mainWorkflow = _testHelpers.CreateWorkflow("wf-main", [_testHelpers.CreateWebhookStep("/no-state")]) with
        {
            State = mainInitialState,
        };
        var sideWorkflow = _testHelpers.CreateWorkflow(
            "wf-side",
            [new StepRequest { OperationId = "observe-state", Command = StateProbeCommand.Create(sideProbeId) }],
            dependsOn: [(WorkflowRef)"wf-main"]
        ) with
        {
            InheritStateFrom = (WorkflowRef)"wf-main",
        };
        var request = _testHelpers.CreateEnqueueRequest([mainWorkflow, sideWorkflow], includeContext: false);

        var accepted = await _client.Enqueue(request);
        await _client.WaitForWorkflowStatus(
            accepted.Workflows.Select(w => w.DatabaseId),
            PersistentItemStatus.Completed
        );

        Assert.True(StateProbeCommand.TryGetObservedStateIn(sideProbeId, out string? sideObservedState));
        Assert.Equal(mainInitialState, sideObservedState);
    }

    [Fact]
    public async Task StateInheritance_IsExposedInStatusResponse()
    {
        var mainWorkflow = _testHelpers.CreateWorkflow("wf-main", [_testHelpers.CreateWebhookStep("/hook")]);
        var sideWorkflow = _testHelpers.CreateWorkflow(
            "wf-side",
            [_testHelpers.CreateWebhookStep("/hook-side")],
            dependsOn: [(WorkflowRef)"wf-main"]
        ) with
        {
            InheritStateFrom = (WorkflowRef)"wf-main",
        };
        var request = _testHelpers.CreateEnqueueRequest([mainWorkflow, sideWorkflow], includeContext: false);

        var accepted = await _client.Enqueue(request);
        await _client.WaitForWorkflowStatus(
            accepted.Workflows.Select(w => w.DatabaseId),
            PersistentItemStatus.Completed
        );

        var mainId = accepted.Workflows[0].DatabaseId;
        var side = await _client.GetWorkflow(accepted.Workflows[1].DatabaseId);
        Assert.NotNull(side);
        Assert.Equal(mainId, side.InheritStateFromWorkflowId);
    }

    [Fact]
    public async Task StateInheritance_CombinedWithExplicitState_Returns400()
    {
        var mainWorkflow = _testHelpers.CreateWorkflow("wf-main", [_testHelpers.CreateWebhookStep("/hook")]);
        var sideWorkflow = _testHelpers.CreateWorkflow(
            "wf-side",
            [_testHelpers.CreateWebhookStep("/hook-side")],
            dependsOn: [(WorkflowRef)"wf-main"]
        ) with
        {
            InheritStateFrom = (WorkflowRef)"wf-main",
            State = """{"explicit":"state"}""",
        };
        var request = _testHelpers.CreateEnqueueRequest([mainWorkflow, sideWorkflow], includeContext: false);

        using var response = await _client.EnqueueRaw(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task StateInheritance_FromNonDependency_Returns400()
    {
        var mainWorkflow = _testHelpers.CreateWorkflow("wf-main", [_testHelpers.CreateWebhookStep("/hook")]);
        var otherWorkflow = _testHelpers.CreateWorkflow("wf-other", [_testHelpers.CreateWebhookStep("/hook-other")]);
        var sideWorkflow = _testHelpers.CreateWorkflow(
            "wf-side",
            [_testHelpers.CreateWebhookStep("/hook-side")],
            dependsOn: [(WorkflowRef)"wf-main"]
        ) with
        {
            InheritStateFrom = (WorkflowRef)"wf-other",
        };
        var request = _testHelpers.CreateEnqueueRequest(
            [mainWorkflow, otherWorkflow, sideWorkflow],
            includeContext: false
        );

        using var response = await _client.EnqueueRaw(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
