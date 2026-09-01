using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using Altinn.ApiClients.Maskinporten.Extensions;
using Altinn.ApiClients.Maskinporten.Services;
using Altinn.Studio.Designer.Configuration;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Http.Resilience;
using Polly;

namespace Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;

public static class ServiceCollectionExtensions
{
    internal const string HttpClientName = "runtime-gateway";

    internal static void AddRuntimeGatewayHttpClient(
        this IServiceCollection services,
        IConfiguration config,
        IHostEnvironment env
    )
    {
        if (env.IsDevelopment())
        {
            // Plain HttpClient for local / mock runtime gateway
            services.AddHttpClient(HttpClientName).AddStandardResilienceHandler(ConfigureResilience);
        }
        else
        {
            var maskinportenClientForRuntime = config
                .GetSection(nameof(MaskinportenClientForRuntime))
                .Get<MaskinportenClientForRuntime>();

            var settings = maskinportenClientForRuntime?.SingleOrDefault().Value;
            if (settings is not null)
            {
                services
                    .AddMaskinportenHttpClient<SettingsJwkClientDefinition>(HttpClientName, settings)
                    .AddStandardResilienceHandler(ConfigureResilience);
            }
        }

        services.AddTransient<IRuntimeGatewayClient, RuntimeGatewayClient>();
    }

    /// <summary>
    /// Narrows what counts as a fault for the runtime gateway client: mutations are never retried,
    /// and the gateway's deliberate 502 is neither retried nor counted against the circuit breaker.
    /// Attempt timeouts, the total request timeout and the concurrency limiter are left at their
    /// standard settings, as is the breaker's behavior for every other failure.
    /// </summary>
    internal static void ConfigureResilience(HttpStandardResilienceOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        // The gateway exposes mutating verbs (workflow resume/abandon, deploy reconcile). A retry
        // after a 5xx/timeout can replay a call the far side already committed, so the operator
        // and the audit trail see a failure for what actually succeeded. Only safe methods retry.
        options.Retry.DisableForUnsafeHttpMethods();

        // 502 from the gateway is a deliberate, stable answer ("workflow engine unavailable in this
        // environment"), not a fault. Retrying it added ~15s of backoff to every poll in
        // environments without an engine, and counting it against the breaker would eventually
        // open the circuit for every other caller of this shared client — deploys, metrics and
        // alerts — because an admin is watching a workflows view. 503/504, transport failures and
        // timeouts still retry and still trip the breaker.
        var shouldRetry = options.Retry.ShouldHandle;
        options.Retry.ShouldHandle = args =>
            IsGatewayEngineUnavailable(args.Outcome.Result) ? PredicateResult.False() : shouldRetry(args);

        var shouldBreak = options.CircuitBreaker.ShouldHandle;
        options.CircuitBreaker.ShouldHandle = args =>
            IsGatewayEngineUnavailable(args.Outcome.Result) ? PredicateResult.False() : shouldBreak(args);
    }

    private static bool IsGatewayEngineUnavailable(HttpResponseMessage? response) =>
        response?.StatusCode == HttpStatusCode.BadGateway;
}
