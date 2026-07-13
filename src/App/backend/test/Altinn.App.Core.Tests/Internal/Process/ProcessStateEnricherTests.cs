using System.Diagnostics;
using System.Security.Claims;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.Base;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using IAuthorizationService = Altinn.App.Core.Internal.Auth.IAuthorizationService;

namespace Altinn.App.Core.Tests.Internal.Process;

public class ProcessStateEnricherTests
{
    [Fact]
    public async Task Enrich_WhenEngineReturnsIdle_PopulatesIdleWorkflowWithoutTargetOrFailure()
    {
        var engine = new Mock<IWorkflowEngineService>(MockBehavior.Strict);
        engine
            .Setup(e => e.ResolveWorkflowTaskStatus(It.IsAny<Instance>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowTaskStatus(WorkflowActivityStatus.Idle, TargetTask: null, Failure: null));

        ProcessStateEnricher enricher = CreateEnricher(engine);

        AppProcessState result = await enricher.Enrich(new Instance(), new ProcessState(), CreateUser());

        Assert.NotNull(result.Workflow);
        Assert.Equal(WorkflowActivityStatus.Idle, result.Workflow.Status);
        Assert.Null(result.Workflow.TargetTask);
        Assert.Null(result.Workflow.Failure);
    }

    [Fact]
    public async Task Enrich_WhenEngineReturnsProcessing_PopulatesProcessingWithTargetTask()
    {
        var engine = new Mock<IWorkflowEngineService>(MockBehavior.Strict);
        engine
            .Setup(e => e.ResolveWorkflowTaskStatus(It.IsAny<Instance>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new WorkflowTaskStatus(WorkflowActivityStatus.Processing, TargetTask: "Task_2", Failure: null)
            );

        ProcessStateEnricher enricher = CreateEnricher(engine);

        AppProcessState result = await enricher.Enrich(new Instance(), new ProcessState(), CreateUser());

        Assert.NotNull(result.Workflow);
        Assert.Equal(WorkflowActivityStatus.Processing, result.Workflow.Status);
        Assert.Equal("Task_2", result.Workflow.TargetTask);
        Assert.Null(result.Workflow.Failure);
    }

    [Fact]
    public async Task Enrich_WhenEngineReturnsFailed_MapsFailureKindButNeverRawDetail()
    {
        var workflowFailure = new WorkflowFailure
        {
            Kind = WorkflowFailureKind.StepFailed,
            LastError = new WorkflowFailureError { Message = "INTERNAL: raw engine error text" },
        };
        var engine = new Mock<IWorkflowEngineService>(MockBehavior.Strict);
        engine
            .Setup(e => e.ResolveWorkflowTaskStatus(It.IsAny<Instance>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new WorkflowTaskStatus(WorkflowActivityStatus.Failed, TargetTask: "Task_2", Failure: workflowFailure)
            );

        ProcessStateEnricher enricher = CreateEnricher(engine);

        AppProcessState result = await enricher.Enrich(new Instance(), new ProcessState(), CreateUser());

        Assert.NotNull(result.Workflow);
        Assert.Equal(WorkflowActivityStatus.Failed, result.Workflow.Status);
        Assert.Equal("Task_2", result.Workflow.TargetTask);
        // Only the coarse classification is projected; the raw error message must never reach the
        // consumer-facing model (it can contain internal infrastructure text).
        Assert.NotNull(result.Workflow.Failure);
        Assert.Equal(WorkflowFailureKind.StepFailed, result.Workflow.Failure.Kind);
    }

    [Fact]
    public async Task Enrich_WhenEngineThrows_DegradesToIdleAndDoesNotThrow()
    {
        var engine = new Mock<IWorkflowEngineService>(MockBehavior.Strict);
        engine
            .Setup(e => e.ResolveWorkflowTaskStatus(It.IsAny<Instance>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("transient engine error"));

        ProcessStateEnricher enricher = CreateEnricher(engine);

        // The read path must not fail just because the live status lookup hiccuped.
        AppProcessState result = await enricher.Enrich(new Instance(), new ProcessState(), CreateUser());

        Assert.NotNull(result.Workflow);
        Assert.Equal(WorkflowActivityStatus.Idle, result.Workflow.Status);
        Assert.Null(result.Workflow.Failure);
    }

    [Fact]
    public async Task Enrich_WhenCallerCancelled_PropagatesCancellation()
    {
        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();

        var engine = new Mock<IWorkflowEngineService>(MockBehavior.Strict);
        engine
            .Setup(e => e.ResolveWorkflowTaskStatus(It.IsAny<Instance>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new OperationCanceledException(cts.Token));

        ProcessStateEnricher enricher = CreateEnricher(engine);

        // The request itself was aborted - that must propagate, not degrade to Idle.
        await Assert.ThrowsAsync<OperationCanceledException>(() =>
            enricher.Enrich(new Instance(), new ProcessState(), CreateUser(), cts.Token)
        );
    }

    [Fact]
    public async Task Enrich_WhenEngineTimesOutWithoutCallerCancellation_DegradesToIdle()
    {
        // HttpClient throws TaskCanceledException on its own timeout; when the caller's token is
        // NOT cancelled this is an engine hiccup, not an aborted request, and must degrade to Idle.
        var engine = new Mock<IWorkflowEngineService>(MockBehavior.Strict);
        engine
            .Setup(e => e.ResolveWorkflowTaskStatus(It.IsAny<Instance>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(
                new TaskCanceledException("The request was canceled due to the configured HttpClient.Timeout")
            );

        ProcessStateEnricher enricher = CreateEnricher(engine);

        AppProcessState result = await enricher.Enrich(new Instance(), new ProcessState(), CreateUser());

        Assert.NotNull(result.Workflow);
        Assert.Equal(WorkflowActivityStatus.Idle, result.Workflow.Status);
    }

    [Fact]
    public async Task Enrich_WhenStatusResolutionExceedsBudget_DegradesToIdle()
    {
        // A slow engine must not hold the read hostage: the enricher's own resolution budget fires
        // and the status degrades to Idle while the caller's request continues normally.
        var engine = new Mock<IWorkflowEngineService>(MockBehavior.Strict);
        engine
            .Setup(e => e.ResolveWorkflowTaskStatus(It.IsAny<Instance>(), It.IsAny<CancellationToken>()))
            .Returns(
                async (Instance _, CancellationToken token) =>
                {
                    await Task.Delay(Timeout.InfiniteTimeSpan, token);
                    throw new UnreachableException();
                }
            );

        ProcessStateEnricher enricher = CreateEnricher(engine);
        enricher.WorkflowStatusResolutionBudget = TimeSpan.FromMilliseconds(50);

        AppProcessState result = await enricher.Enrich(new Instance(), new ProcessState(), CreateUser());

        Assert.NotNull(result.Workflow);
        Assert.Equal(WorkflowActivityStatus.Idle, result.Workflow.Status);
    }

    // Isolates the workflow mapping: the flow-element / authorization block is a no-op (no current
    // task flow element, no flow elements), so only the IWorkflowEngineService result is exercised.
    private static ProcessStateEnricher CreateEnricher(Mock<IWorkflowEngineService> engine)
    {
        var processReader = new Mock<IProcessReader>(MockBehavior.Strict);
        processReader.Setup(r => r.GetFlowElement(It.IsAny<string?>())).Returns((ProcessElement?)null);
        processReader.Setup(r => r.GetAllFlowElements()).Returns([]);

        var serviceProvider = new ServiceCollection().AddSingleton(engine.Object).BuildServiceProvider();

        return new ProcessStateEnricher(
            processReader.Object,
            Mock.Of<IAuthorizationService>(),
            serviceProvider,
            NullLogger<ProcessStateEnricher>.Instance
        );
    }

    private static ClaimsPrincipal CreateUser() => new(new ClaimsIdentity());
}
