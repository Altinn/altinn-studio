using System.Threading.Tasks;
using Altinn.App.Core.Features.Process;
using Microsoft.Extensions.DependencyInjection;
using TestApp.Shared;

namespace Altinn.App.Integration.Tests.Scenarios.WorkflowEngineSuccess;

public sealed class SuccessfulServiceTask : IServiceTask
{
    public string Type => "write";

    public ServiceTaskPipeline Define(PipelineBuilder pipeline) => pipeline.Finally(Execute);

    public Task<ServiceTaskResult> Execute(StageContext context)
    {
        SnapshotLogger.LogInfo("IServiceTask.Execute.Success");
        ServiceTaskResult result = ServiceTaskResult.Success();
        return Task.FromResult(result);
    }
}

public static class ServiceRegistration
{
    public static void RegisterServices(IServiceCollection services)
    {
        services.AddTransient<IServiceTask, SuccessfulServiceTask>();
    }
}
