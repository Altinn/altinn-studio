using System.Diagnostics;
using System.Security.Claims;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.Base;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
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
        // Not retrying maps to null (omitted on the wire), never a serialized `false`; no engine
        // step counts maps to an omitted progress object.
        Assert.Null(result.Workflow.Retrying);
        Assert.Null(result.Workflow.Progress);
    }

    [Fact]
    public async Task Enrich_WhenEngineReturnsRetryingWithProgress_PopulatesHints()
    {
        var engine = new Mock<IWorkflowEngineService>(MockBehavior.Strict);
        engine
            .Setup(e => e.ResolveWorkflowTaskStatus(It.IsAny<Instance>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new WorkflowTaskStatus(
                    WorkflowActivityStatus.Processing,
                    TargetTask: "Task_2",
                    Failure: null,
                    Retrying: true,
                    Progress: new WorkflowStepProgress(Completed: 7, Total: 12)
                )
            );

        ProcessStateEnricher enricher = CreateEnricher(engine);

        AppProcessState result = await enricher.Enrich(new Instance(), new ProcessState(), CreateUser());

        Assert.NotNull(result.Workflow);
        Assert.Equal(WorkflowActivityStatus.Processing, result.Workflow.Status);
        Assert.True(result.Workflow.Retrying);
        Assert.NotNull(result.Workflow.Progress);
        Assert.Equal(7, result.Workflow.Progress.Completed);
        Assert.Equal(12, result.Workflow.Progress.Total);
    }

    [Fact]
    public async Task Enrich_WhenEngineReturnsFailed_MapsSafeStructuredFactsButNeverRawDetail()
    {
        Guid failedWorkflowId = Guid.NewGuid();
        DateTimeOffset failedAt = DateTimeOffset.UtcNow.AddMinutes(-1);
        var workflowFailure = new WorkflowFailure
        {
            Kind = WorkflowFailureKind.StepFailed,
            WorkflowId = failedWorkflowId,
            LastError = new WorkflowFailureError { Message = "INTERNAL: raw engine error text", Timestamp = failedAt },
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
        // Only the coarse classification and the safe support-reference facts (which workflow,
        // when) are projected; the raw error message must never reach the consumer-facing model
        // (it can contain internal infrastructure text).
        Assert.NotNull(result.Workflow.Failure);
        Assert.Equal(WorkflowFailureKind.StepFailed, result.Workflow.Failure.Kind);
        Assert.Equal(failedWorkflowId, result.Workflow.Failure.WorkflowId);
        Assert.Equal(failedAt, result.Workflow.Failure.OccurredAt);
    }

    [Fact]
    public async Task Enrich_WhenEngineCommunicationFails_PropagatesError()
    {
        var engine = new Mock<IWorkflowEngineService>(MockBehavior.Strict);
        engine
            .Setup(e => e.ResolveWorkflowTaskStatus(It.IsAny<Instance>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("connection refused"));

        ProcessStateEnricher enricher = CreateEnricher(engine);

        // A v9 app is codependent on the engine: failing to talk to it is a systemic fault that
        // must surface on the read, not be masked as an idle annotation.
        await Assert.ThrowsAsync<HttpRequestException>(() =>
            enricher.Enrich(new Instance(), new ProcessState(), CreateUser())
        );
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

        // The request itself was aborted - that must propagate as a cancellation, not be
        // translated into a timeout error.
        await Assert.ThrowsAsync<OperationCanceledException>(() =>
            enricher.Enrich(new Instance(), new ProcessState(), CreateUser(), ct: cts.Token)
        );
    }

    [Fact]
    public async Task Enrich_WhenEngineTimesOutWithoutCallerCancellation_ThrowsActionableTimeout()
    {
        // HttpClient throws TaskCanceledException on its own timeout; when the caller's token is
        // NOT cancelled this is an engine communication fault. It must surface as an actionable
        // timeout error, not read as a client abort (and not degrade to idle).
        var engine = new Mock<IWorkflowEngineService>(MockBehavior.Strict);
        engine
            .Setup(e => e.ResolveWorkflowTaskStatus(It.IsAny<Instance>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(
                new TaskCanceledException("The request was canceled due to the configured HttpClient.Timeout")
            );

        ProcessStateEnricher enricher = CreateEnricher(engine);

        await Assert.ThrowsAsync<TimeoutException>(() =>
            enricher.Enrich(new Instance(), new ProcessState(), CreateUser())
        );
    }

    [Fact]
    public async Task Enrich_WhenStatusResolutionExceedsBudget_ThrowsActionableTimeout()
    {
        // A slow engine must not hold the read hostage for the HTTP client's full timeout: the
        // enricher's own resolution budget fires and fails the read fast, as an actionable error.
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

        await Assert.ThrowsAsync<TimeoutException>(() =>
            enricher.Enrich(new Instance(), new ProcessState(), CreateUser())
        );
    }

    [Fact]
    public async Task Enrich_WhenWorkflowStatusOptedOut_OmitsAnnotationAndNeverCallsEngine()
    {
        // No setup on the strict mock: any engine call would throw. Opting out must skip the
        // engine entirely and leave the annotation null (distinguishable from idle).
        var engine = new Mock<IWorkflowEngineService>(MockBehavior.Strict);

        ProcessStateEnricher enricher = CreateEnricher(engine);

        AppProcessState result = await enricher.Enrich(
            new Instance(),
            new ProcessState(),
            CreateUser(),
            includeWorkflowStatus: false
        );

        Assert.Null(result.Workflow);
        engine.VerifyNoOtherCalls();
    }

    // Isolates the workflow mapping: the flow-element / authorization block is a no-op (no current
    // task flow element, no flow elements), so only the IWorkflowEngineService result is exercised.
    private static ProcessStateEnricher CreateEnricher(Mock<IWorkflowEngineService> engine)
    {
        var processReader = new Mock<IProcessReader>(MockBehavior.Strict);
        processReader.Setup(r => r.GetFlowElement(It.IsAny<string?>())).Returns((ProcessElement?)null);
        processReader.Setup(r => r.GetAllFlowElements()).Returns([]);

        var serviceProvider = new ServiceCollection().AddSingleton(engine.Object).BuildServiceProvider();

        return new ProcessStateEnricher(processReader.Object, Mock.Of<IAuthorizationService>(), serviceProvider);
    }

    private static ClaimsPrincipal CreateUser() => new(new ClaimsIdentity());
}
