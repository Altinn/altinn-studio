using System.Net.Http;
using System.Threading.Tasks;
using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Integration.Tests.Scenarios.UpgradeFailedServiceTask;

/// <summary>
/// Takes the place of the built-in PDF service task while the app runs v8, and fails the way that task does when
/// the PDF generator is unavailable. v8 then leaves the instance in the PDF task. The v9 side of the scenario has no
/// replacement, so after the upgrade the built-in PDF task is the one that runs.
/// </summary>
public sealed class UnavailablePdfServiceTask : IServiceTask
{
    public string Type => "pdf";

    public Task<ServiceTaskResult> Execute(ServiceTaskContext context) =>
        throw new HttpRequestException("The PDF generator is unavailable (simulated by the test scenario).");
}

public static class ServiceRegistration
{
    // Scenario services are registered before the app libraries' services, and v8 runs the first registered
    // service task of a type, so this one is used instead of the built-in PDF task.
    public static void RegisterServices(IServiceCollection services) =>
        services.AddTransient<IServiceTask, UnavailablePdfServiceTask>();
}
