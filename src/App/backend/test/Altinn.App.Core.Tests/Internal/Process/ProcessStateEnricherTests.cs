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
    public async Task Enrich_WhenEngineReturnsFailed_MapsFailureDetailAndKind()
    {
        var workflowFailure = new WorkflowFailure
        {
            Kind = WorkflowFailureKind.StepFailed,
            LastError = new WorkflowFailureError { Message = "The service task failed." },
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
        Assert.NotNull(result.Workflow.Failure);
        Assert.Equal("The service task failed.", result.Workflow.Failure.Detail);
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
    public async Task Enrich_WhenCancelled_PropagatesCancellation()
    {
        var engine = new Mock<IWorkflowEngineService>(MockBehavior.Strict);
        engine
            .Setup(e => e.ResolveWorkflowTaskStatus(It.IsAny<Instance>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new OperationCanceledException());

        ProcessStateEnricher enricher = CreateEnricher(engine);

        await Assert.ThrowsAsync<OperationCanceledException>(() =>
            enricher.Enrich(new Instance(), new ProcessState(), CreateUser())
        );
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
