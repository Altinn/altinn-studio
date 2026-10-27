using Altinn.App.Ai.Enrichment.Configuration;
using Altinn.App.Ai.Enrichment.Telemetry;
using Altinn.App.Core.Internal.Secrets;
using Microsoft.Extensions.Options;

namespace Altinn.App.Ai.Enrichment.ServiceTasks;

/// <summary>
/// Resolves the Langfuse secret key for apps: a directly configured
/// <c>SecretKey</c> wins (local dev); otherwise the secret named by
/// <c>SecretKeySecretName</c> is fetched once through the app's
/// <see cref="ISecretsClient"/> and cached for the process lifetime.
///
/// A failed lookup returns null and is logged, never thrown — losing traces is
/// preferable to failing the process step that produces them.
/// </summary>
public sealed class SecretsLangfuseKeyProvider(
    IOptions<LangfuseOptions> options,
    ISecretsClient secretsClient,
    ILogger<SecretsLangfuseKeyProvider> logger) : ILangfuseKeyProvider
{
    private readonly SemaphoreSlim _fetchLock = new(1, 1);
    private string? _cached;
    private bool _failed;

    public async ValueTask<string?> GetSecretKeyAsync(CancellationToken cancellationToken = default)
    {
        var opts = options.Value;
        if (!string.IsNullOrWhiteSpace(opts.SecretKey))
            return opts.SecretKey;

        if (_cached is not null)
            return _cached;

        // One failed lookup is enough: the secret name is static configuration, so a
        // second attempt would fail the same way once per export batch.
        if (_failed || string.IsNullOrWhiteSpace(opts.SecretKeySecretName))
            return null;

        await _fetchLock.WaitAsync(cancellationToken);
        try
        {
            if (_cached is not null)
                return _cached;

            var secret = await secretsClient.GetSecretAsync(opts.SecretKeySecretName);
            if (string.IsNullOrWhiteSpace(secret))
            {
                _failed = true;
                logger.LogError(
                    "Langfuse secret '{SecretName}' resolved to an empty value; tracing export is disabled",
                    opts.SecretKeySecretName);
                return null;
            }

            _cached = secret;
            return _cached;
        }
        catch (Exception ex)
        {
            _failed = true;
            logger.LogError(
                ex,
                "Could not resolve Langfuse secret '{SecretName}'; tracing export is disabled",
                opts.SecretKeySecretName);
            return null;
        }
        finally
        {
            _fetchLock.Release();
        }
    }
}
