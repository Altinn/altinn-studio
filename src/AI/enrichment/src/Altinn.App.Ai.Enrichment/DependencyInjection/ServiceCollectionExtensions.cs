using Altinn.App.Ai.Enrichment.Agents;
using Altinn.App.Ai.Enrichment.Chat;
using Altinn.App.Ai.Enrichment.Configuration;
using Altinn.App.Ai.Enrichment.Orchestration;
using Altinn.App.Ai.Enrichment.Rendering;
using Altinn.App.Ai.Enrichment.ServiceTasks;
using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Altinn.App.Ai.Enrichment.DependencyInjection;

public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers AI enrichment for an Altinn app: the enrichment engine plus
    /// the <c>kiBeriking</c> process service task. Call from
    /// <c>RegisterCustomAppServices</c> in the app's Program.cs — this is the
    /// only line of custom code an app needs. The API key resolves through the
    /// app's secrets client when <c>AiEnrichment:Agent:ApiKey</c> is not set.
    /// </summary>
    public static IServiceCollection AddAiEnrichment(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Registered before core so this wins over ConfigurationApiKeyProvider.
        services.TryAddSingleton<IApiKeyProvider, SecretsApiKeyProvider>();
        services.AddAiEnrichmentCore(configuration);

        services.Configure<KiBerikingOptions>(configuration.GetSection(KiBerikingOptions.SectionName));
        services.AddTransient<IServiceTask, KiBerikingServiceTask>();

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

        services.AddHttpClient(OpenAiCompatibleChatService.HttpClientName);
        services.TryAddSingleton<IApiKeyProvider, ConfigurationApiKeyProvider>();
        services.AddSingleton<IChatService, OpenAiCompatibleChatService>();
        services.AddSingleton<ITypstRenderer, TypstRenderer>();
        services.AddSingleton<IRulesLoader, MarkdownRulesLoader>();
        services.AddSingleton<AgentRuntimeFactory>();

        return services;
    }
}
