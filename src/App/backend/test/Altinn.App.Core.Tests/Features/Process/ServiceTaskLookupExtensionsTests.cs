using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Tests.Features.Process;

public class ServiceTaskLookupExtensionsTests
{
    private sealed class BuiltInPdfTask : IServiceTask
    {
        public string Type => "pdf";

        public void DefineExecute(PipelineBuilder.ServiceTask pipeline) => pipeline.Stage(Execute);

        public Task<ServiceTaskResult> Execute(StageContext context) => Task.FromResult(ServiceTaskResult.Completed());
    }

    private sealed class ReplacementPdfTask : IServiceTask
    {
        public string Type => "pdf";

        public void DefineExecute(PipelineBuilder.ServiceTask pipeline) => pipeline.Stage(Execute);

        public Task<ServiceTaskResult> Execute(StageContext context) => Task.FromResult(ServiceTaskResult.Completed());
    }

    private static ServiceProvider CreateProvider(Action<IServiceCollection> register)
    {
        var services = new ServiceCollection();
        register(services);
        return services.BuildServiceProvider();
    }

    [Fact]
    public void FindServiceTask_MatchesTheTypeExactly()
    {
        using ServiceProvider provider = CreateProvider(s => s.AddSingleton<IServiceTask, BuiltInPdfTask>());
        var factory = new AppImplementationFactory(provider);

        Assert.IsType<BuiltInPdfTask>(factory.FindServiceTask("pdf"));
        Assert.Null(factory.FindServiceTask("PDF"));
    }

    [Fact]
    public void FindServiceTask_LastRegistrationWins()
    {
        using ServiceProvider provider = CreateProvider(s =>
        {
            s.AddSingleton<IServiceTask, BuiltInPdfTask>();
            s.AddSingleton<IServiceTask, ReplacementPdfTask>();
        });
        var factory = new AppImplementationFactory(provider);

        Assert.IsType<ReplacementPdfTask>(factory.FindServiceTask("pdf"));
    }

    /// <summary>
    /// A task whose <c>DefineExecute</c> the test scripts, so compositions reach the runtime's own resolution.
    /// </summary>
    private sealed class ScriptedTask(Action<PipelineBuilder.ServiceTask> define) : IServiceTask
    {
        public string Type => "archiving";

        public void DefineExecute(PipelineBuilder.ServiceTask pipeline) => define(pipeline);
    }

    private static Task<ServiceTaskResult> Archive(StageContext context) =>
        Task.FromResult(ServiceTaskResult.Completed());

    [Fact]
    public void ResolvePipeline_ComposesOnAFreshBuilderEachTime()
    {
        var builders = new List<PipelineBuilder.ServiceTask>();
        var task = new ScriptedTask(builder =>
        {
            builders.Add(builder);
            builder.Stage(Archive);
        });

        ServiceTaskPipeline first = task.ResolvePipeline();
        ServiceTaskPipeline second = task.ResolvePipeline();

        Assert.Single(first.Items);
        Assert.Single(second.Items);
        Assert.NotSame(builders[0], builders[1]);
    }

    [Fact]
    public void ResolvePipeline_ADefineExecuteThatComposesNothing_IsRefusedNamingTheTaskType()
    {
        var task = new ScriptedTask(_ => { });

        InvalidOperationException thrown = Assert.Throws<InvalidOperationException>(() => task.ResolvePipeline());

        Assert.Contains("'archiving'", thrown.Message, StringComparison.Ordinal);
        Assert.Contains(nameof(ScriptedTask), thrown.Message, StringComparison.Ordinal);
    }
}
