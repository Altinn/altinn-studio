using System;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Studio.Designer.TypedHttpClients.Operator;

/// <summary>
/// Registers the core-operator client.
/// </summary>
internal static class OperatorServiceCollectionExtensions
{
    /// <summary>
    /// Registers <see cref="IOperatorClient"/> when <see cref="OperatorSettings.BaseUrl"/> is set. Where
    /// Designer cannot reach an operator, the setting stays empty and nothing can resolve the client.
    /// </summary>
    /// <remarks>
    /// The client has no resilience handler. An upload sends the caller's archive stream, which a retry cannot send
    /// again, and a long poll waits longer than the standard attempt timeout. A caller retries instead. A repeated
    /// create finds the run in progress, and the caller can send an upload that broke off again with a new stream.
    /// </remarks>
    internal static IServiceCollection AddOperatorHttpClient(this IServiceCollection services, IConfiguration config)
    {
        var settings = config.GetSection(nameof(OperatorSettings)).Get<OperatorSettings>();
        if (string.IsNullOrWhiteSpace(settings?.BaseUrl))
        {
            return services;
        }

        // Without the trailing slash, a base address with a path would lose its last segment to the relative paths.
        var baseAddress = new Uri(settings.BaseUrl.EndsWith('/') ? settings.BaseUrl : $"{settings.BaseUrl}/");
        services.AddTransient<OperatorTokenHandler>();
        services
            .AddHttpClient<IOperatorClient, OperatorClient>(client => client.BaseAddress = baseAddress)
            .AddHttpMessageHandler<OperatorTokenHandler>();

        return services;
    }
}
