using System.Runtime.CompilerServices;
using Altinn.App.Clients.Fiks.FiksArkiv;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;
using Moq;

namespace Altinn.App.Clients.Fiks.Tests.FiksArkiv;

public class FiksArkivUnreferencedTaskWarningTest
{
    [Fact]
    public async Task StartupValidation_FiksArkivEnabledWithoutAFiksArkivTask_LogsWarning()
    {
        var services = new ServiceCollection();
        var reader = new Mock<IProcessReader>();
        reader.Setup(r => r.GetProcessTasks()).Returns([]);
        services.AddSingleton(reader.Object);
        var metadata = new Mock<IAppMetadata>();
        metadata.Setup(m => m.ApplicationMetadata).Returns(new ApplicationMetadata("ttd/app"));
        services.AddSingleton(metadata.Object);
        var environment = new Mock<IHostEnvironment>();
        environment.SetupGet(e => e.EnvironmentName).Returns("tt02");
        services.AddSingleton(environment.Object);
        // AddFiksArkiv() registers this; its dependencies are irrelevant to startup validation.
        services.AddSingleton<IPipelineServiceTask>(
            (FiksArkivServiceTask)RuntimeHelpers.GetUninitializedObject(typeof(FiksArkivServiceTask))
        );
        await using ServiceProvider provider = services.BuildServiceProvider();
        var logger = new FakeLogger<ProcessTaskConfigurationValidationService>();
        var service = new ProcessTaskConfigurationValidationService(
            provider.GetRequiredService<IServiceScopeFactory>(),
            logger
        );

        await service.StartAsync(CancellationToken.None);

        FakeLogRecord warning = Assert.Single(
            logger.Collector.GetSnapshot(),
            record => record.Level == LogLevel.Warning
        );
        Assert.StartsWith("Service task type 'fiksArkiv' is registered", warning.Message);
    }
}
