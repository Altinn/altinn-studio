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
            .Validate(
                settings => settings.BaseUrl.IsAbsoluteUri && string.IsNullOrEmpty(settings.BaseUrl.Query),
                "WorkflowEngine.BaseUrl must be an absolute URI without a query string."
            )
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
                client.BaseAddress = NormalizeBaseUrl(settings.BaseUrl);
                client.Timeout = _requestTimeout;
            }
        );

        services.AddSingleton<WorkflowEngineClient>();

        return services;
    }

    /// <summary>
    /// Ensures the base URL ends with a trailing slash: under RFC 3986 reference resolution a
    /// path-bearing base without one silently drops its last segment when a relative path is
    /// resolved against it.
    /// </summary>
    internal static Uri NormalizeBaseUrl(Uri baseUrl) =>
        baseUrl.AbsolutePath.EndsWith('/') ? baseUrl : new Uri(baseUrl.AbsoluteUri + "/");
}
