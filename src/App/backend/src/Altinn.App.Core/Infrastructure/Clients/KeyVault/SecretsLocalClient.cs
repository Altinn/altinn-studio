using System.Text.Json;
using Altinn.App.Core.Internal.Secrets;
using Microsoft.Azure.KeyVault;
using Microsoft.Azure.KeyVault.WebKey;
using Microsoft.Extensions.Configuration;

namespace Altinn.App.Core.Infrastructure.Clients.KeyVault;

/// <summary>
/// Class that handles integration with Azure Key Vault
/// </summary>
public class SecretsLocalClient : ISecretsClient
{
    private readonly IConfiguration _configuration;

    /// <summary>
    /// Initializes a new instance of the <see cref="SecretsLocalClient"/> class.
    /// </summary>
    /// <param name="configuration">IConfiguration</param>
    public SecretsLocalClient(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    /// <inheritdoc />
    public Task<byte[]> GetCertificateAsync(string certificateName)
    {
        string token = GetTokenFromSecrets(certificateName);
        byte[] localCertBytes = Convert.FromBase64String(token);
        return Task.FromResult(localCertBytes);
    }

    /// <inheritdoc />
    public Task<JsonWebKey> GetKeyAsync(string keyName)
    {
        string token = GetTokenFromSecrets(keyName);
        // ! TODO: this null-forgiving operator should be fixed/removed for the next major release
        JsonWebKey key = JsonSerializer.Deserialize<JsonWebKey>(token)!;
        return Task.FromResult(key);
    }

    /// <inheritdoc />
    public KeyVaultClient GetKeyVaultClient()
    {
        throw new NotSupportedException();
    }

    /// <inheritdoc />
    public async Task<string> GetSecretAsync(string secretName)
    {
        string token = GetTokenFromSecrets(secretName);
        return await Task.FromResult(token);
    }

    private string GetTokenFromSecrets(string secretId) =>
        GetTokenFromLocalSecrets(secretId)
        ?? GetTokenFromConfiguration(secretId)
        ?? throw new ArgumentException($"SecretId={secretId} does not exist in appsettings or secrets.json");

    private string? GetTokenFromConfiguration(string tokenId) => _configuration[tokenId];

    private static string? GetTokenFromLocalSecrets(string secretId)
    {
        string path = Path.Join(Directory.GetCurrentDirectory(), @"secrets.json");
        if (File.Exists(path))
        {
            string jsonString = File.ReadAllText(path);
            var document = JsonDocument.Parse(
                jsonString,
                new JsonDocumentOptions { AllowTrailingCommas = true, CommentHandling = JsonCommentHandling.Skip }
            );
            if (document.RootElement.TryGetProperty(secretId, out var jsonElement))
            {
                return jsonElement.GetString();
            }
        }

        return null;
    }
}
