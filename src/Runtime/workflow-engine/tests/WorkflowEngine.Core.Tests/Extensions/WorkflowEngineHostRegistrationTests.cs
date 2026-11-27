using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using WorkflowEngine.Core.Extensions;

namespace WorkflowEngine.Core.Tests.Extensions;

public class WorkflowEngineHostRegistrationTests
{
    [Theory]
    [InlineData(typeof(MetricsCollector))]
    [InlineData(typeof(WorkflowCountCollector))]
    [InlineData(typeof(FinishedWorkflowCountCollector))]
    public void TheHost_RunsEachWorkflowCountCollector(Type collector)
    {
        var services = new ServiceCollection();

        services.AddWorkflowEngineHost();

        Assert.Contains(services, d => d.ServiceType == typeof(IHostedService) && d.ImplementationType == collector);
    }
}
