using System.Threading.Tasks;
using Altinn.App.Core.Features.Process;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Integration.Tests.Scenarios.WorkflowEngineFailure;

public sealed class FailingServiceTask : IServiceTask
{
    public string Type => "failing-service";

    public Task<ServiceTaskResult> Execute(ServiceTaskContext context) =>
        Task.FromResult<ServiceTaskResult>(
            ServiceTaskResult.FailedPermanent("Scenario service task failed permanently.")
        );
}

public static class ServiceRegistration
{
    public static void RegisterServices(IServiceCollection services)
    {
        services.AddTransient<IServiceTask, FailingServiceTask>();
    }
}
