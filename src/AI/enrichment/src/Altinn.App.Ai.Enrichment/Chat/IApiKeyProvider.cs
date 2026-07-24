namespace Altinn.App.Ai.Enrichment.Chat;

/// <summary>
/// Resolves the API key for the chat gateway. The core registration reads it
/// from configuration; the service-task registration falls back to the app's
/// secrets client (Key Vault) when configuration leaves it empty.
/// </summary>
public interface IApiKeyProvider
{
    ValueTask<string> GetApiKeyAsync(CancellationToken cancellationToken = default);
}
