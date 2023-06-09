using System.Text.Json;
using Altinn.App.Core.Internal.Secrets;
using Microsoft.Azure.KeyVault;
using Microsoft.Azure.KeyVault.WebKey;
using Microsoft.Extensions.Configuration;
using Newtonsoft.Json.Linq;

namespace Altinn.App.Core.Infrastructure.Clients.KeyVault
{
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
        public async Task<byte[]> GetCertificateAsync(string certificateId)
        {
            string token = GetTokenFromSecrets(certificateId);
            if (!string.IsNullOrEmpty(token))
            {
                byte[] localCertBytes = Convert.FromBase64String(token);
                return await Task.FromResult(localCertBytes);
            }

            return null;
        }

        /// <inheritdoc />
        public async Task<JsonWebKey> GetKeyAsync(string keyId)
        {
            string token = GetTokenFromSecrets(keyId);
            if (!string.IsNullOrEmpty(token))
            {
                JsonWebKey key = JsonSerializer.Deserialize<JsonWebKey>(token);
                return await Task.FromResult(key);
            }

            return null;
        }

        /// <inheritdoc />
        public KeyVaultClient GetKeyVaultClient()
        {
            throw new NotSupportedException();
        }

        /// <inheritdoc />
        public async Task<string> GetSecretAsync(string secretId)
        {
            string token = GetTokenFromSecrets(secretId);
            return await Task.FromResult(token);
        }

        private string GetTokenFromSecrets(string tokenId)
            => GetTokenFromConfiguration(tokenId) ??
                GetTokenFromLocalSecrets(tokenId);

        private string GetTokenFromConfiguration(string tokenId)
            => _configuration[tokenId];

        private static string GetTokenFromLocalSecrets(string tokenId)
        {
            string path = Path.Combine(Directory.GetCurrentDirectory(), @"secrets.json");
            if (File.Exists(path))
            {
                string jsonString = File.ReadAllText(path);
                JObject keyVault = JObject.Parse(jsonString);
                keyVault.TryGetValue(tokenId, out JToken? token);
                return token != null ? token.ToString() : string.Empty;
            }

            return string.Empty;
        }
    }
}
