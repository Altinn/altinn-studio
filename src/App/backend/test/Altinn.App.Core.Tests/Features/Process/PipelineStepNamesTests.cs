using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Tests.Features.Process;

public class PipelineStepNamesTests
{
    private sealed class SimpleTask : IServiceTask
    {
        public string Type => "simple";

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) =>
            Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
    }

    private sealed class ExplicitTask : IServiceTask
    {
        public string Type => "explicit";

        Task<ServiceTaskResult> IServiceTask.Execute(ServiceTaskContext context) =>
            Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
    }

    private static Task<ServiceTaskStageResult> SendToArchive(ServiceTaskContext context) =>
        Task.FromResult(ServiceTaskStageResult.Completed());

    private static Task<ServiceTaskStageResult> GeneratePDFReceipt(ServiceTaskContext context) =>
        Task.FromResult(ServiceTaskStageResult.Completed());

    private static Task<ServiceTaskStageResult> SendTilÅrsmøte(ServiceTaskContext context) =>
        Task.FromResult(ServiceTaskStageResult.Completed());

    private static Task<ServiceTaskStageResult> LagreØkonomiRapport(ServiceTaskContext context) =>
        Task.FromResult(ServiceTaskStageResult.Completed());

    [Fact]
    public void Resolve_ExplicitName_IsTrimmedAndWinsOverTheMethodName()
    {
        Assert.Equal("Be om godkjenning", PipelineStepNames.Resolve("  Be om godkjenning ", SendToArchive, "name"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Resolve_BlankName_Throws(string name)
    {
        var exception = Assert.Throws<ArgumentException>(() => PipelineStepNames.Resolve(name, SendToArchive, "name"));
        Assert.Equal("name", exception.ParamName);
    }

    [Fact]
    public void Resolve_NameLongerThanTheLimit_Throws()
    {
        string longest = new('a', PipelineStepNames.MaxNameLength);

        Assert.Equal(longest, PipelineStepNames.Resolve(longest, SendToArchive, "name"));
        // The limit is on the name as displayed, after trimming.
        Assert.Equal(longest, PipelineStepNames.Resolve($" {longest} ", SendToArchive, "name"));
        Assert.Throws<ArgumentException>(() => PipelineStepNames.Resolve(longest + "a", SendToArchive, "name"));
    }

    [Fact]
    public void Resolve_MethodGroup_IsTheMethodNameAsWords()
    {
        Assert.Equal("Send to archive", PipelineStepNames.Resolve(null, SendToArchive, "name"));
        Assert.Equal("Generate PDF receipt", PipelineStepNames.Resolve(null, GeneratePDFReceipt, "name"));
    }

    /// <summary>A capital outside ASCII starts a word too, so Norwegian method names keep their spacing.</summary>
    [Fact]
    public void Resolve_MethodGroupWithNorwegianLetters_SplitsAtEveryCapital()
    {
        Assert.Equal("Send til årsmøte", PipelineStepNames.Resolve(null, SendTilÅrsmøte, "name"));
        Assert.Equal("Lagre økonomi rapport", PipelineStepNames.Resolve(null, LagreØkonomiRapport, "name"));
    }

    [Fact]
    public void Resolve_LocalFunction_IsTheLocalFunctionsName()
    {
        static Task<ServiceTaskStageResult> RequestApproval(ServiceTaskContext context) =>
            Task.FromResult(ServiceTaskStageResult.Completed());

        Assert.Equal("Request approval", PipelineStepNames.Resolve(null, RequestApproval, "name"));
    }

    [Fact]
    public void Resolve_Lambda_HasNoName()
    {
        Func<ServiceTaskContext, Task<ServiceTaskStageResult>> work = _ =>
            Task.FromResult(ServiceTaskStageResult.Completed());

        Assert.Null(PipelineStepNames.Resolve(null, work, "name"));
    }

    [Fact]
    public void Resolve_SimpleServiceTasksExecute_HasNoName()
    {
        IServiceTask simple = new SimpleTask();
        IServiceTask explicitTask = new ExplicitTask();

        Assert.Null(PipelineStepNames.Resolve(null, simple.Execute, "name"));
        Assert.Null(PipelineStepNames.Resolve(null, explicitTask.Execute, "name"));
    }

    [Fact]
    public void Builder_SimpleServiceTask_ConcludesWithoutAName()
    {
        ServiceTaskPipeline pipeline = new SimpleTask().ResolvePipeline();

        Assert.Null(Assert.Single(pipeline.Items).DisplayName);
    }
}
