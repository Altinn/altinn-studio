using System.Runtime.CompilerServices;
using Altinn.App.Clients.Fiks.FiksArkiv;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace Altinn.App.Clients.Fiks.Tests.FiksArkiv;

public class FiksArkivServiceTaskRegistrationTests
{
    private sealed class AppFiksArkivTask : IServiceTask
    {
        public string Type => "fiksArkiv";

        public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
            pipeline.Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));
    }

    [Fact]
    public async Task AppTaskReusingTheFiksArkivType_FailsStartup()
    {
        var services = new ServiceCollection();
        // FiksArkivServiceTask.Type is a literal, so it can be read without the task's dependencies.
        services.AddSingleton<IServiceTask>(_ =>
            (FiksArkivServiceTask)RuntimeHelpers.GetUninitializedObject(typeof(FiksArkivServiceTask))
        );
        services.AddSingleton<IServiceTask, AppFiksArkivTask>();
        await using var provider = services.BuildServiceProvider();
        var validator = new ServiceTaskRegistrationValidator(
            provider.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<ServiceTaskRegistrationValidator>.Instance,
            new ServiceTaskRegistrationValidator.ServiceRegistrations(services)
        );

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            validator.StartAsync(CancellationToken.None)
        );

        Assert.Contains(typeof(AppFiksArkivTask).FullName!, exception.Message, StringComparison.Ordinal);
        Assert.Contains("'fiksArkiv'", exception.Message, StringComparison.Ordinal);
        Assert.Contains(nameof(FiksArkivServiceTask), exception.Message, StringComparison.Ordinal);
        Assert.Contains("cannot be replaced", exception.Message, StringComparison.Ordinal);
    }
}
