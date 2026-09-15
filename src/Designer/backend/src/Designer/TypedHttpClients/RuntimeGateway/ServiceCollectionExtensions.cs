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
    /// <summary>
    /// The client every deploy, metrics and alerts call uses, with the standard resilience
    /// handler as it comes.
    /// </summary>
    internal const string HttpClientName = "runtime-gateway";

    /// <summary>
    /// The client the admin workflow pass-through uses: the same transport and credentials as
    /// <see cref="HttpClientName"/>, with its own resilience.
    /// </summary>
    /// <remarks>
    /// What is right for a proxied workflow call — never replay a mutation, treat the gateway's
    /// 502 as an answer, wait as long as the gateway itself waits on the engine — would be wrong
    /// for a deploy reconcile or a metrics poll, and a circuit breaker shared with them would let
    /// an admin watching a workflows view open the circuit for everyone. So the two never share
    /// a pipeline.
    /// </remarks>
    internal const string WorkflowsHttpClientName = "runtime-gateway-workflows";

    /// <summary>
    /// How long the gateway gives the engine per phase (headers, then body) before answering
    /// "engine unavailable"; mirrors <c>WorkflowEngine.RequestTimeout</c> in the gateway's settings.
    /// Designer's own attempt has to outlast one phase, or a mutation the gateway is still waiting
    /// on is reported to the operator as a failure that the engine then completes anyway.
    /// </summary>
    internal static readonly TimeSpan GatewayEnginePhaseBudget = TimeSpan.FromSeconds(30);

    internal static void AddRuntimeGatewayHttpClient(
        this IServiceCollection services,
        IConfiguration config,
        IHostEnvironment env
    )
    {
        if (env.IsDevelopment())
        {
            // Plain HttpClients for a local / mock runtime gateway
            services.AddHttpClient(HttpClientName).AddStandardResilienceHandler();
            services.AddHttpClient(WorkflowsHttpClientName).AddStandardResilienceHandler(ConfigureWorkflowsResilience);
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
                    .AddStandardResilienceHandler();
                services
                    .AddMaskinportenHttpClient<SettingsJwkClientDefinition>(WorkflowsHttpClientName, settings)
                    .AddStandardResilienceHandler(ConfigureWorkflowsResilience);
            }
        }

        services.AddTransient<IRuntimeGatewayClient, RuntimeGatewayClient>();
    }

    /// <summary>
    /// Resilience for the workflow pass-through client only. Mutations are never retried, reads
    /// retry once, the attempt budget follows the gateway's own wait on the engine, and the
    /// gateway's deliberate 502 is neither retried nor counted against the circuit breaker.
    /// </summary>
    internal static void ConfigureWorkflowsResilience(HttpStandardResilienceOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        // Resume and abandon are mutations the engine commits. A retry after a timeout replays a
        // call the far side may already have completed, and the operator and the audit trail then
        // see a failure for what succeeded. Only the reads retry, and once: the admin UI polls, so
        // its next request is the retry the standard three would otherwise pile up.
        options.Retry.DisableForUnsafeHttpMethods();
        options.Retry.MaxRetryAttempts = 1;

        // An attempt must outlast the gateway's own wait on the engine, and the total must cover
        // the one retry. The breaker's sampling window has to be at least twice the attempt
        // timeout (the standard handler validates that), so it moves with them.
        options.AttemptTimeout.Timeout = GatewayEnginePhaseBudget + TimeSpan.FromSeconds(5);
        options.TotalRequestTimeout.Timeout = 2 * options.AttemptTimeout.Timeout + TimeSpan.FromSeconds(5);
        options.CircuitBreaker.SamplingDuration = options.TotalRequestTimeout.Timeout;

        // 502 from the gateway is a deliberate, stable answer ("workflow engine unavailable in this
        // environment"), not a fault: retrying it added ~15 s of backoff to every poll in an
        // environment without an engine, and counting it against the breaker would open the
        // circuit because an admin is watching a workflows view. Matching on the status alone also
        // exempts a 502 from an ingress in front of the gateway; that is accepted here, and only
        // here, because the one thing this client serves is a polled admin view whose next poll is
        // the retry. 503/504, transport failures and timeouts still retry and still trip the breaker.
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
