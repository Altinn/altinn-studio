using Altinn.App.Ai.Enrichment.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.App.Ai.Enrichment.Chat;

/// <summary>Reads the API key straight from bound configuration (env var / appsettings).</summary>
public sealed class ConfigurationApiKeyProvider(IOptions<AgentOptions> options) : IApiKeyProvider
{
    public ValueTask<string> GetApiKeyAsync(CancellationToken cancellationToken = default)
    {
        var apiKey = options.Value.ApiKey;
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException(
                $"{AgentOptions.SectionName}:ApiKey is required. Set it via configuration, " +
                $"or use AddAiEnrichment() with {AgentOptions.SectionName}:ApiKeySecretName to resolve it from the app's secrets client.");
        }
        return ValueTask.FromResult(apiKey);
    }
}
