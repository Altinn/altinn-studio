namespace Altinn.App.Ai.Enrichment.Telemetry;

/// <summary>
/// Resolves the Langfuse secret key. Mirrors <c>IApiKeyProvider</c>: the core
/// registration reads it from configuration; the service-task registration falls
/// back to the app's secrets client (Key Vault) when configuration leaves it empty.
///
/// Unlike the chat API key, a missing Langfuse key is never fatal — tracing is an
/// observability concern and must not stop an app from serving. Implementations
/// return <c>null</c> rather than throwing, and the caller disables export.
/// </summary>
public interface ILangfuseKeyProvider
{
    ValueTask<string?> GetSecretKeyAsync(CancellationToken cancellationToken = default);
}
