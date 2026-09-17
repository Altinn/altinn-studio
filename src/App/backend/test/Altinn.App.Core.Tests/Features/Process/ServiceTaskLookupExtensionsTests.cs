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

    private static AppImplementationFactory Factory(Action<IServiceCollection> register)
    {
        var services = new ServiceCollection();
        register(services);
        return new AppImplementationFactory(services.BuildServiceProvider());
    }

    [Fact]
    public void FindServiceTask_MatchesTheTypeExactly()
    {
        AppImplementationFactory factory = Factory(s => s.AddSingleton<IServiceTask, BuiltInPdfTask>());

        Assert.IsType<BuiltInPdfTask>(factory.FindServiceTask("pdf"));
        Assert.Null(factory.FindServiceTask("PDF"));
    }

    [Fact]
    public void FindServiceTask_LastRegistrationWins()
    {
        // An app's own task registered after a built-in replaces it.
        AppImplementationFactory factory = Factory(s =>
        {
            s.AddSingleton<IServiceTask, BuiltInPdfTask>();
            s.AddSingleton<IServiceTask, ReplacementPdfTask>();
        });

        Assert.IsType<ReplacementPdfTask>(factory.FindServiceTask("pdf"));
    }
}
