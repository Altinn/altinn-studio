using Altinn.Augmenter.Agent.Services.Agent;
using Altinn.Augmenter.Agent.Services.Agent.Chat;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Altinn.Augmenter.Agent.Tests.Integration.Helpers;

public class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((_, config) =>
        {
            var typstPath = TypstLocator.FindTypst();
            var settings = new Dictionary<string, string?>
            {
                ["Callback:AllowedPatterns:0"] = "http://localhost:*/*",
            };

            if (typstPath != null)
            {
                settings["Typst:Path"] = typstPath;
            }

            config.AddInMemoryCollection(settings);
        });

        // Replace LLM-bound services with stubs so integration tests verify
        // pipeline plumbing without depending on a live SANDKASSE_API_KEY.
        //   IAgentService → empty string ⇒ AgentPdfStep falls back to unevaluated-data PDF
        //   IChatService  → canned "ikke_vurdert" verdict ⇒ AgentPdfOrchestratedStep
        //                   still produces a valid sjekkliste (all punkter default)
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IAgentService>();
            services.AddScoped<IAgentService, EmptyAgentService>();

            services.RemoveAll<IChatService>();
            services.AddScoped<IChatService, CannedChatService>();
        });
    }
}

internal sealed class EmptyAgentService : IAgentService
{
    public Task<string> RunAsync(AgentRequest request, CancellationToken cancellationToken = default)
        => Task.FromResult(string.Empty);
}

internal sealed class CannedChatService : IChatService
{
    public Task<ChatResponse> RunAsync(ChatRequest request, CancellationToken cancellationToken = default)
        => Task.FromResult(new ChatResponse
        {
            Content = """{"status":"ikke_vurdert","merknad":"Stubbed in TestWebApplicationFactory"}""",
            StatusCode = 200,
        });
}
