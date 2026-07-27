using System.Threading.Tasks;
using Altinn.App.Core.Features.Process;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Integration.Tests.Scenarios.WorkflowEngineInstantiationFailure;

public sealed class FailingTaskStartHandler : IOnTaskStartingHandler
{
    public bool ShouldRunForTask(string taskId) => taskId == "Task_1";

    public Task<HookResult> Execute(OnTaskStartingContext context) =>
        Task.FromResult<HookResult>(HookResult.FailedPermanent("Scenario task start failed permanently."));
}

public static class ServiceRegistration
{
    public static void RegisterServices(IServiceCollection services)
    {
        services.AddTransient<IOnTaskStartingHandler, FailingTaskStartHandler>();
    }
}
