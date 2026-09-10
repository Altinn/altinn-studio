using Altinn.App.Ai.Enrichment.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.App.Ai.Enrichment.Telemetry;

/// <summary>Reads the Langfuse secret key straight from bound configuration (env var / appsettings).</summary>
public sealed class ConfigurationLangfuseKeyProvider(IOptions<LangfuseOptions> options) : ILangfuseKeyProvider
{
    public ValueTask<string?> GetSecretKeyAsync(CancellationToken cancellationToken = default)
    {
        var secretKey = options.Value.SecretKey;
        return ValueTask.FromResult(string.IsNullOrWhiteSpace(secretKey) ? null : secretKey);
    }
}
