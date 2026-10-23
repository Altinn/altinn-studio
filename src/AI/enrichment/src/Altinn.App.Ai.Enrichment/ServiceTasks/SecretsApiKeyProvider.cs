using Altinn.App.Ai.Enrichment.Chat;
using Altinn.App.Ai.Enrichment.Configuration;
using Altinn.App.Core.Internal.Secrets;
using Microsoft.Extensions.Options;

namespace Altinn.App.Ai.Enrichment.ServiceTasks;

/// <summary>
/// Resolves the chat gateway API key for apps: a directly configured
/// <c>ApiKey</c> wins (local dev via env/appsettings); otherwise the secret
/// named by <c>ApiKeySecretName</c> is fetched once through the app's
/// <see cref="ISecretsClient"/> (Key Vault in TT02/prod) and cached for the
/// process lifetime.
/// </summary>
public sealed class SecretsApiKeyProvider(
    IOptions<AgentOptions> options,
    ISecretsClient secretsClient) : IApiKeyProvider
{
    private readonly SemaphoreSlim _fetchLock = new(1, 1);
    private string? _cached;

    public async ValueTask<string> GetApiKeyAsync(CancellationToken cancellationToken = default)
    {
        var opts = options.Value;
        if (!string.IsNullOrWhiteSpace(opts.ApiKey))
            return opts.ApiKey;

        if (_cached is not null)
            return _cached;

        if (string.IsNullOrWhiteSpace(opts.ApiKeySecretName))
        {
            throw new InvalidOperationException(
                $"Neither {AgentOptions.SectionName}:ApiKey nor {AgentOptions.SectionName}:ApiKeySecretName is configured. " +
                $"Set the key directly for local dev, or name the Key Vault secret for deployed environments.");
        }

        await _fetchLock.WaitAsync(cancellationToken);
        try
        {
            _cached ??= await secretsClient.GetSecretAsync(opts.ApiKeySecretName);
            if (string.IsNullOrWhiteSpace(_cached))
                throw new InvalidOperationException($"Secret '{opts.ApiKeySecretName}' resolved to an empty value.");
            return _cached;
        }
        finally
        {
            _fetchLock.Release();
        }
    }
}
