using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.App.Services.Interface;
using AltinnCore.Authentication.Constants;
using Microsoft.Azure.KeyVault;
using Microsoft.Azure.KeyVault.Models;
using Microsoft.Azure.KeyVault.WebKey;
using Microsoft.Azure.Services.AppAuthentication;
using Microsoft.Extensions.Options;
using Newtonsoft.Json.Linq;

namespace Altinn.App.PlatformServices.Implementation
{
    /// <summary>
    /// Class that handles integration with Azure Key Vault
    /// </summary>
    public class KeyVaultAppSI : IKeyVault
    {
        private readonly string _vaultUri;
        private readonly bool _useMock;
        private readonly AzureServiceTokenProvider _azureServiceTokenProvider;

        /// <summary>
        /// Initializes a new instance of the <see cref="KeyVaultAppSI"/> class with a client using the credentials from the key vault settings.
        /// </summary>
        /// <param name="keyVaultSettings">
        /// The <see cref="KeyVaultSettings"/> with information about the principal to use when getting secrets from a key vault.
        /// </param>
        public KeyVaultAppSI(IOptions<KeyVaultSettings> keyVaultSettings)
        {
            string _connectionString = $"RunAs=App;AppId={keyVaultSettings.Value.ClientId};" +
                                 $"TenantId={keyVaultSettings.Value.TenantId};" +
                                 $"AppKey={keyVaultSettings.Value.ClientSecret}";
            _vaultUri = keyVaultSettings.Value.SecretUri;
            _useMock = !Directory.GetParent(Directory.GetCurrentDirectory()).FullName.Equals("/");
            _azureServiceTokenProvider = new AzureServiceTokenProvider(_connectionString);
        }

        /// </inheritdoc>
        public async Task<byte[]> GetCertificateAsync(string certificateId)
        {
            if (_useMock)
            {
                string path = Path.Combine(Directory.GetCurrentDirectory(), @"keyvault.json");
                if (File.Exists(path))
                {
                    string jsonString = File.ReadAllText(path);
                    JObject keyVault = JObject.Parse(jsonString);
                    keyVault.TryGetValue(certificateId, out JToken token);

                    if (token != null)
                    {
                        byte[] localCertBytes = Convert.FromBase64String(token.ToString());
                        return localCertBytes;
                    }
                }

                return null;
            }

            using KeyVaultClient client = new KeyVaultClient(new KeyVaultClient.AuthenticationCallback(_azureServiceTokenProvider.KeyVaultTokenCallback));
            CertificateBundle cert = await client.GetCertificateAsync(certificateId);

            return cert.Cer;
        }

        /// </inheritdoc>
        public async Task<JsonWebKey> GetKeyAsync(string keyId)
        {
            if (_useMock)
            {
                string path = Path.Combine(Directory.GetCurrentDirectory(), @"keyVault.json");
                if (File.Exists(path))
                {
                    JObject keyVault = JObject.Parse(File.ReadAllText(path));
                    keyVault.TryGetValue(keyId, out JToken token);

                    if (token != null)
                    {
                        JsonWebKey key = JsonSerializer.Deserialize<JsonWebKey>(token.ToString());
                        return key;
                    }
                }

                return null;
            }

            using KeyVaultClient client = new KeyVaultClient(new KeyVaultClient.AuthenticationCallback(_azureServiceTokenProvider.KeyVaultTokenCallback));
            KeyBundle kb = await client.GetKeyAsync(_vaultUri, keyId);

            return kb.Key;
        }

        /// </inheritdoc>
        public KeyVaultClient GetKeyVaultClient()
        {
            KeyVaultClient client = new KeyVaultClient(new KeyVaultClient.AuthenticationCallback(_azureServiceTokenProvider.KeyVaultTokenCallback));
            return client;
        }

        /// </inheritdoc>
        public async Task<string> GetSecretAsync(string secretId)
        {
            if (_useMock)
            {
                string path = Path.Combine(Directory.GetCurrentDirectory(), @"keyVault.json");
                if (File.Exists(path))
                {
                    string jsonString = File.ReadAllText(path);
                    JObject keyVault = JObject.Parse(jsonString);
                    keyVault.TryGetValue(secretId, out JToken token);
                    return token != null ? token.ToString() : string.Empty;
                }

                return string.Empty;
            }

            using KeyVaultClient client = new KeyVaultClient(new KeyVaultClient.AuthenticationCallback(_azureServiceTokenProvider.KeyVaultTokenCallback));
            SecretBundle sb = await client.GetSecretAsync(_vaultUri, secretId);

            return sb.Value;
        }
    }
}
