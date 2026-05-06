namespace Altinn.Studio.AppManager.Studioctl;

internal static class ServiceCollectionExtensions
{
    public static IServiceCollection AddStudioctlServices(this IServiceCollection services)
    {
        services.AddSingleton<RegisterApp>();
        services.AddSingleton<UnregisterApp>();
        return services;
    }
}
