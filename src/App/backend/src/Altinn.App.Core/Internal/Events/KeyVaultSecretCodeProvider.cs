using Altinn.App.Core.Internal.Secrets;

namespace Altinn.App.Core.Internal.Events;

/// <summary>
/// Provides a secret code from Azure Key Vault to be used with
/// the Event system.
/// </summary>
public class KeyVaultEventSecretCodeProvider : IEventSecretCodeProvider
{
    private readonly ISecretsClient _keyVaultClient;
    private string _secretCode = string.Empty;

    /// <summary>
    /// Provides a new instance of <see cref="KeyVaultEventSecretCodeProvider"/>
    /// This
    /// </summary>
    /// <param name="keyVaultClient"></param>
    public KeyVaultEventSecretCodeProvider(ISecretsClient keyVaultClient)
    {
        _keyVaultClient = keyVaultClient;
    }

    /// <inheritdoc/>
    public async Task<string> GetSecretCode()
    {
        if (!string.IsNullOrEmpty(_secretCode))
        {
            return _secretCode;
        }

        var secretKey = "EventSubscription--SecretCode";
        string secretCode = await _keyVaultClient.GetSecretAsync(secretKey);
        if (secretCode == null)
        {
            throw new ArgumentException(
                $"Unable to fetch event subscription secret code from key vault with the specified secret {secretKey}."
            );
        }

        _secretCode = secretCode;
        return _secretCode;
    }
}
