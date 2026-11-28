using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Tests.Features.Process;

public class PipelineStepNamesTests
{
    private sealed class SimpleTask : IServiceTask
    {
        public string Type => "simple";

        public void DefineExecute(PipelineBuilder.ServiceTask pipeline) => pipeline.Stage(Execute);

        public Task<ServiceTaskResult> Execute(StageContext context) => Task.FromResult(ServiceTaskResult.Completed());
    }

    private static Task<StageResult> SendToArchive(StageContext context) => Task.FromResult(StageResult.Completed());

    private static Task<StageResult> GeneratePDFReceipt(StageContext context) =>
        Task.FromResult(StageResult.Completed());

    private static Task<StageResult> SendTilÅrsmøte(StageContext context) => Task.FromResult(StageResult.Completed());

    private static Task<StageResult> LagreØkonomiRapport(StageContext context) =>
        Task.FromResult(StageResult.Completed());

    private static Task<ServiceTaskResult> ConfirmOrder(StageContext context) =>
        Task.FromResult(ServiceTaskResult.Completed());

    private static Task<ServiceTaskResult> GenerateReceipt(StageContext context) =>
        Task.FromResult(ServiceTaskResult.Completed());

    [Fact]
    public void FromMethod_MethodGroup_IsTheMethodNameAsWords()
    {
        Assert.Equal("Send to archive", PipelineStepNames.FromMethod(SendToArchive));
        Assert.Equal("Generate PDF receipt", PipelineStepNames.FromMethod(GeneratePDFReceipt));
    }

    /// <summary>A capital outside ASCII starts a word too, so Norwegian method names keep their spacing.</summary>
    [Fact]
    public void FromMethod_MethodGroupWithNorwegianLetters_SplitsAtEveryCapital()
    {
        Assert.Equal("Send til årsmøte", PipelineStepNames.FromMethod(SendTilÅrsmøte));
        Assert.Equal("Lagre økonomi rapport", PipelineStepNames.FromMethod(LagreØkonomiRapport));
    }

    [Fact]
    public void FromMethod_LocalFunction_IsTheLocalFunctionsName()
    {
        static Task<StageResult> RequestApproval(StageContext context) => Task.FromResult(StageResult.Completed());

        Assert.Equal("Request approval", PipelineStepNames.FromMethod(RequestApproval));
    }

    [Fact]
    public void FromMethod_Lambda_HasNoName()
    {
        Func<StageContext, Task<StageResult>> work = _ => Task.FromResult(StageResult.Completed());

        Assert.Null(PipelineStepNames.FromMethod(work));
    }

    [Fact]
    public void FromMethod_ServiceTasksOwnExecute_HasNoName()
    {
        Func<StageContext, Task<ServiceTaskResult>> work = new SimpleTask().Execute;

        Assert.Null(PipelineStepNames.FromMethod(work));
    }

    [Fact]
    public void Builder_NamesEveryItemAfterItsMethod()
    {
        ProcessTaskPipeline lifecycle = new PipelineBuilder.Lifecycle()
            .Stage(SendToArchive)
            .Stage(_ => Task.FromResult(StageResult.Completed()))
            .ToPipeline();
        ServiceTaskPipeline execute = new PipelineBuilder.ServiceTask()
            .Stage(GenerateReceipt)
            .Stage(ConfirmOrder)
            .ToPipeline();

        Assert.Equal(["Send to archive", null], lifecycle.Stages.Select(stage => stage.DisplayName));
        Assert.Equal(["Generate receipt", "Confirm order"], execute.Items.Select(item => item.DisplayName));
    }

    private static Task<ServiceTaskResult> RequestApproval(StageContext context, ReplyAddress replyAddress) =>
        Task.FromResult(ServiceTaskResult.Completed());

    private static Task<ServiceTaskReplyResult> OnDecision(StageContext context, ServiceTaskReply reply) =>
        Task.FromResult(ServiceTaskReplyResult.Completed());

    private static Task<ServiceTaskResult> OnTimeout(StageContext context) =>
        Task.FromResult(ServiceTaskResult.Completed());

    /// <summary>
    /// An external stage's send is named after its method. Which of the receive step's two methods runs is known only
    /// when the reply or the close arrives, so that step is named after both, and never after one that did not run.
    /// </summary>
    [Fact]
    public void Builder_NamesAnExternalStagesSendAndReceiveSteps()
    {
        var withTimeout = Assert.IsType<ServiceTaskItem.ExternalStage>(
            Assert.Single(
                new PipelineBuilder.ServiceTask()
                    .ExternalStage(RequestApproval, OnDecision, onTimeout: OnTimeout)
                    .ToPipeline()
                    .Items
            )
        );
        var withoutTimeout = Assert.IsType<ServiceTaskItem.ExternalStage>(
            Assert.Single(
                new PipelineBuilder.ServiceTask().ExternalStage(RequestApproval, OnDecision).ToPipeline().Items
            )
        );

        Assert.Equal("Request approval", withTimeout.DisplayName);
        Assert.Equal("On decision / On timeout", withTimeout.ReplyDisplayName);
        Assert.Equal("On decision", withoutTimeout.ReplyDisplayName);
    }

    [Fact]
    public void Builder_SimpleServiceTask_HasAStepWithoutAName()
    {
        var builder = new PipelineBuilder.ServiceTask();
        new SimpleTask().DefineExecute(builder);

        Assert.Null(Assert.Single(builder.ToPipeline().Items).DisplayName);
    }
}
