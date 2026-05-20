using Altinn.Augmenter.Agent.Services.Agent;
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

        // Replace the agent service with a stub that returns empty output, so
        // the AgentPdfStep falls back to the unevaluated-data PDF rendering
        // path. Integration tests verify the pipeline plumbing, not LLM I/O.
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IAgentService>();
            services.AddScoped<IAgentService, EmptyAgentService>();
        });
    }
}

internal sealed class EmptyAgentService : IAgentService
{
    public Task<string> RunAsync(AgentRequest request, CancellationToken cancellationToken = default)
        => Task.FromResult(string.Empty);
}
