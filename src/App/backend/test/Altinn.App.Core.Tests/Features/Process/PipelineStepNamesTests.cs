using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Tests.Features.Process;

public class PipelineStepNamesTests
{
    private sealed class SimpleTask : IServiceTask
    {
        public string Type => "simple";

        public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) => pipeline.Finally(Execute);

        public Task<ServiceTaskResult> Execute(StageContext context) =>
            Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
    }

    private static Task<StageResult> SendToArchive(StageContext context) => Task.FromResult(StageResult.Completed());

    private static Task<StageResult> GeneratePDFReceipt(StageContext context) =>
        Task.FromResult(StageResult.Completed());

    private static Task<StageResult> SendTilÅrsmøte(StageContext context) => Task.FromResult(StageResult.Completed());

    private static Task<StageResult> LagreØkonomiRapport(StageContext context) =>
        Task.FromResult(StageResult.Completed());

    private static Task<ServiceTaskResult> ConfirmOrder(StageContext context) =>
        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

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
        ProcessTaskPipeline lifecycle = new PipelineBuilder()
            .Stage(SendToArchive)
            .Stage(_ => Task.FromResult(StageResult.Completed()))
            .Build();
        ServiceTaskPipeline execute = new PipelineBuilder().Stage(GeneratePDFReceipt).Finally(ConfirmOrder);

        Assert.Equal(["Send to archive", null], lifecycle.Stages.Select(stage => stage.DisplayName));
        Assert.Equal(["Generate PDF receipt", "Confirm order"], execute.Items.Select(item => item.DisplayName));
    }

    private static Task<ServiceTaskOpeningStageResult> RequestApproval(
        StageContext context,
        ServiceTaskMailbox mailbox
    ) => Task.FromResult(ServiceTaskOpeningStageResult.Completed());

    private static Task<ServiceTaskExchangeResult> OnDecision(StageContext context, ServiceTaskReply reply) =>
        Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskResult.Success());

    private static Task<ServiceTaskResult> OnClosed(StageContext context, MailboxClosedReason reason) =>
        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

    /// <summary>
    /// Which of a reply handler's two methods runs is known only when the message or the close arrives, so the step
    /// is named after both, and never after one that did not run.
    /// </summary>
    [Fact]
    public void Builder_NamesAReplyHandlerAfterBothItsMethods()
    {
        ServiceTaskPipeline pipeline = new PipelineBuilder()
            .Stage(RequestApproval, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out MailboxHandle approval)
            .ConcludeOnReplies(approval, OnDecision, OnClosed);

        Assert.Equal(["Request approval", "On decision / On closed"], pipeline.Items.Select(item => item.DisplayName));
    }

    [Fact]
    public void Builder_SimpleServiceTask_ConcludesWithoutAName()
    {
        ServiceTaskPipeline pipeline = new SimpleTask().DefineExecute(new PipelineBuilder());

        Assert.Null(Assert.Single(pipeline.Items).DisplayName);
    }
}
