using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Tests.Features.Process;

public class ServiceTaskLookupExtensionsTests
{
    private sealed class BuiltInPdfTask : IServiceTask
    {
        public string Type => "pdf";

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) =>
            Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
    }

    private sealed class ReplacementPdfTask : IServiceTask
    {
        public string Type => "pdf";

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) =>
            Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
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
}
