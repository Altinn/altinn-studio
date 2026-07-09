using Altinn.App.Ai.Enrichment.Agents;
using Altinn.App.Ai.Enrichment.Chat;
using Altinn.App.Ai.Enrichment.Configuration;
using Altinn.App.Ai.Enrichment.Orchestration;
using Altinn.App.Ai.Enrichment.Rendering;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Ai.Enrichment.DependencyInjection;

public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers the enrichment engine: chat gateway client, Typst renderer and
    /// the <see cref="AgentRuntimeFactory"/> that loads agents from folders.
    /// Binds <see cref="AgentOptions"/> and <see cref="TypstOptions"/> from the
    /// <c>AiEnrichment</c> configuration section. The kiBeriking service task
    /// registration (phase 2) builds on top of this.
    /// </summary>
    public static IServiceCollection AddAiEnrichmentCore(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<AgentOptions>(configuration.GetSection(AgentOptions.SectionName));
        services.Configure<TypstOptions>(configuration.GetSection(TypstOptions.SectionName));

        services.AddHttpClient(OpenAiCompatibleChatService.HttpClientName);
        services.AddSingleton<IChatService, OpenAiCompatibleChatService>();
        services.AddSingleton<ITypstRenderer, TypstRenderer>();
        services.AddSingleton<IRulesLoader, MarkdownRulesLoader>();
        services.AddSingleton<AgentRuntimeFactory>();

        return services;
    }
}
