using System.Threading.Tasks;
using Altinn.App.Core.Features.Process;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Integration.Tests.Scenarios.WorkflowEngineDuplicateTaskEndingHooks;

public sealed class FirstTaskEndingHook : IOnTaskEndingHandler
{
    public bool ShouldRunForTask(string taskId) => taskId == "Task_1";

    public Task<HookResult> Execute(OnTaskEndingContext context) => Task.FromResult<HookResult>(HookResult.Success());
}

public sealed class SecondTaskEndingHook : IOnTaskEndingHandler
{
    public bool ShouldRunForTask(string taskId) => taskId == "Task_1";

    public Task<HookResult> Execute(OnTaskEndingContext context) => Task.FromResult<HookResult>(HookResult.Success());
}

public static class ServiceRegistration
{
    public static void RegisterServices(IServiceCollection services)
    {
        services.AddTransient<IOnTaskEndingHandler, FirstTaskEndingHook>();
        services.AddTransient<IOnTaskEndingHandler, SecondTaskEndingHook>();
    }
}
