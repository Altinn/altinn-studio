using System.Threading.Tasks;
using Altinn.App.Core.Features.Process;
using Microsoft.Extensions.DependencyInjection;
using TestApp.Shared;

namespace Altinn.App.Integration.Tests.Scenarios.WorkflowEngineSuccessWithoutAutoAdvance;

public sealed class ManualServiceTask : IServiceTask
{
    public string Type => "write";

    public Task<ServiceTaskResult> Execute(ServiceTaskContext context)
    {
        SnapshotLogger.LogInfo("IServiceTask.Execute.SuccessWithoutAutoAdvance");
        ServiceTaskResult result = ServiceTaskResult.SuccessWithoutAutoAdvance();
        return Task.FromResult(result);
    }
}

public static class ServiceRegistration
{
    public static void RegisterServices(IServiceCollection services)
    {
        services.AddTransient<IServiceTask, ManualServiceTask>();
    }
}
