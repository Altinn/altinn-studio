using Altinn.Augmenter.Agent.Services.Agent.Chat;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Altinn.Augmenter.Agent.Tests.Integration.Helpers;

/// <summary>
/// Same TestServer as <see cref="TestWebApplicationFactory"/>, but every
/// <c>ContentPaths.*Root</c> is overridden to point at examples/alt-config/
/// instead of the repo's config/. Used by AltConfigSwapTests to verify the
/// image stays domain-agnostic — if any hidden coupling to bevillinger field
/// names or registry shapes leaks into the engine, this factory's startup
/// will fail (via ConfigValidator) or the pipeline will throw when serving
/// /generate.
/// </summary>
public sealed class AltConfigWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        var altConfigRoot = AltConfigLocator.GetConfigRoot();

        builder.ConfigureAppConfiguration((_, config) =>
        {
            var typstPath = TypstLocator.FindTypst();
            var settings = new Dictionary<string, string?>
            {
                ["Callback:AllowedPatterns:0"] = "http://localhost:*/*",
                ["ContentPaths:TemplatesRoot"]    = Path.Combine(altConfigRoot, "templates"),
                ["ContentPaths:MappingsRoot"]     = Path.Combine(altConfigRoot, "mappings"),
                ["ContentPaths:RegistriesRoot"]   = Path.Combine(altConfigRoot, "registries"),
                ["ContentPaths:RulesRoot"]        = Path.Combine(altConfigRoot, "rules"),
                ["ContentPaths:OrchestratorRoot"] = Path.Combine(altConfigRoot, "orchestrator"),
                ["ContentPaths:ToolsRoot"]        = Path.Combine(altConfigRoot, "tools"),
            };

            if (typstPath != null)
                settings["Typst:Path"] = typstPath;

            config.AddInMemoryCollection(settings);
        });

        // Same canned LLM stub as TestWebApplicationFactory — keeps the test
        // independent of SANDKASSE_API_KEY.
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IChatService>();
            services.AddScoped<IChatService, AltConfigCannedChatService>();
        });
    }
}

/// <summary>
/// Returns a stub vurdering for every per-item LLM call. Different merknad
/// than <see cref="TestWebApplicationFactory.CannedChatService"/> so test
/// output makes it obvious which factory is in use when both are running.
/// </summary>
internal sealed class AltConfigCannedChatService : IChatService
{
    public Task<ChatResponse> RunAsync(ChatRequest request, CancellationToken cancellationToken = default)
        => Task.FromResult(new ChatResponse
        {
            Content = """{"status":"vurdert_ok","merknad":"Stubbed in AltConfigCannedChatService"}""",
            StatusCode = 200,
        });
}
