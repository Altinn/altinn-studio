using Altinn.App.Ai.Enrichment.Agents;
using Altinn.App.Ai.Enrichment.Chat;
using Altinn.App.Ai.Enrichment.Configuration;
using Altinn.App.Ai.Enrichment.Orchestration;
using Altinn.App.Ai.Enrichment.Rendering;
using Altinn.App.Ai.Enrichment.ServiceTasks;
using Altinn.App.Ai.Enrichment.Telemetry;
#if NET10_0_OR_GREATER
using Altinn.App.Core.Features.Process;
#else
using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;
#endif
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Altinn.App.Ai.Enrichment.DependencyInjection;

public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers AI enrichment for an Altinn app: the enrichment engine plus
    /// the <c>ai</c> process service task. Call from
    /// <c>RegisterCustomAppServices</c> in the app's Program.cs — this is the
    /// only line of custom code an app needs. The API key resolves through the
    /// app's secrets client when <c>AiEnrichment:Agent:ApiKey</c> is not set.
    /// </summary>
    public static IServiceCollection AddAiEnrichment(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Registered before core so these win over the Configuration* fallbacks.
        services.TryAddSingleton<IApiKeyProvider, SecretsApiKeyProvider>();
        services.TryAddSingleton<ILangfuseKeyProvider, SecretsLangfuseKeyProvider>();
        services.AddAiEnrichmentCore(configuration);

        services.Configure<AiEnrichmentOptions>(configuration.GetSection(AiEnrichmentOptions.SectionName));
        services.AddTransient<IServiceTask, AiServiceTask>();

        return services;
    }

    /// <summary>
    /// Registers the enrichment engine only: chat gateway client, Typst renderer
    /// and the <see cref="AgentRuntimeFactory"/> that loads agents from folders.
    /// Binds <see cref="AgentOptions"/> and <see cref="TypstOptions"/> from the
    /// <c>AiEnrichment</c> configuration section. Use this outside an Altinn app
    /// (tests, tools); apps use <see cref="AddAiEnrichment"/>.
    /// </summary>
    public static IServiceCollection AddAiEnrichmentCore(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<AgentOptions>(configuration.GetSection(AgentOptions.SectionName));
        services.Configure<TypstOptions>(configuration.GetSection(TypstOptions.SectionName));
        services.Configure<LangfuseOptions>(configuration.GetSection(LangfuseOptions.SectionName));

        // Infinite client-level timeout: HttpClient's default (100s) would fire
        // before AgentOptions.TimeoutSeconds; the chat service enforces the
        // configured budget per call via a linked CancellationTokenSource.
        services
            .AddHttpClient(OpenAiCompatibleChatService.HttpClientName)
            .ConfigureHttpClient(client => client.Timeout = Timeout.InfiniteTimeSpan);
        services.TryAddSingleton<IApiKeyProvider, ConfigurationApiKeyProvider>();
        services.TryAddSingleton<ILangfuseKeyProvider, ConfigurationLangfuseKeyProvider>();

        // The graph is identical whether tracing is on or off: LangfuseTracing inspects
        // Enabled at start-up and simply builds no provider when it is false, leaving the
        // ActivitySource without a listener and every call site a null check.
        services.AddSingleton<EnrichmentTrace>();
        services.AddSingleton<LangfuseTracing>();
        services.AddSingleton<IHostedService>(sp => sp.GetRequiredService<LangfuseTracing>());

        // Reading and writing scores is a separate concern from exporting spans: it runs
        // long after a run, often in bulk, and stays available even when export is off.
        services.AddHttpClient(LangfuseScoreClient.HttpClientName);
        services.AddSingleton<ILangfuseScoreClient, LangfuseScoreClient>();

        services.AddSingleton<IChatService, OpenAiCompatibleChatService>();
        services.AddSingleton<ITypstRenderer, TypstRenderer>();
        services.AddSingleton<IRulesLoader, MarkdownRulesLoader>();
        services.AddSingleton<AgentRuntimeFactory>();

        return services;
    }
}
