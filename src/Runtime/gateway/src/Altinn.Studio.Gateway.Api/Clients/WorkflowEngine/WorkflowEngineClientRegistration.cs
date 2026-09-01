using Altinn.Studio.Gateway.Api.Settings;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Clients.WorkflowEngine;

internal static class WorkflowEngineClientRegistration
{
    /// <summary>
    /// Upstream request timeout. Kept short: the engine is namespace-local and the caller
    /// (Designer admin UI) waits synchronously — a hung engine should degrade to the
    /// "engine unavailable" envelope quickly.
    /// </summary>
    private static readonly TimeSpan _requestTimeout = TimeSpan.FromSeconds(30);

    public static IServiceCollection AddWorkflowEngineClient(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        services
            .AddOptions<WorkflowEngineSettings>()
            .Bind(configuration.GetSection(WorkflowEngineSettings.SectionName))
            .Validate(settings => settings.BaseUrl.IsAbsoluteUri, "WorkflowEngine.BaseUrl must be an absolute URI.")
            .ValidateOnStart();

        // No resilience handler on purpose: resume/abandon are mutations, and a blanket retry
        // would replay them. The engine is one hop away; failures surface as the distinct
        // "engine unavailable" envelope and the caller decides whether to retry.
        services.AddHttpClient(
            WorkflowEngineClient.HttpClientName,
            (serviceProvider, client) =>
            {
                var settings = serviceProvider
                    .GetRequiredService<IOptionsMonitor<WorkflowEngineSettings>>()
                    .CurrentValue;
                client.BaseAddress = settings.BaseUrl;
                client.Timeout = _requestTimeout;
            }
        );

        services.AddSingleton<WorkflowEngineClient>();

        return services;
    }
}
