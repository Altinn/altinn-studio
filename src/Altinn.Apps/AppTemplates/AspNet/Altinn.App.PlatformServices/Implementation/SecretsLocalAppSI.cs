using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.App.Services.Interface;
using Microsoft.Azure.KeyVault;
using Microsoft.Azure.KeyVault.WebKey;
using Newtonsoft.Json.Linq;

namespace Altinn.App.PlatformServices.Implementation
{
    /// <summary>
    /// Class that handles integration with Azure Key Vault
    /// </summary>
    public class SecretsLocalAppSI : ISecrets
    {
        /// </inheritdoc>
        public async Task<byte[]> GetCertificateAsync(string certificateId)
        {
            string path = Path.Combine(Directory.GetCurrentDirectory(), @"secrets.json");
            if (File.Exists(path))
            {
                string jsonString = File.ReadAllText(path);
                JObject keyVault = JObject.Parse(jsonString);
                keyVault.TryGetValue(certificateId, out JToken token);

                if (token != null)
                {
                    byte[] localCertBytes = Convert.FromBase64String(token.ToString());
                    return await Task.FromResult(localCertBytes);
                }
            }

            return null;
        }


        /// </inheritdoc>
        public async Task<JsonWebKey> GetKeyAsync(string keyId)
        {
            string path = Path.Combine(Directory.GetCurrentDirectory(), @"secrets.json");
            if (File.Exists(path))
            {
                JObject keyVault = JObject.Parse(File.ReadAllText(path));
                keyVault.TryGetValue(keyId, out JToken token);

                if (token != null)
                {
                    JsonWebKey key = JsonSerializer.Deserialize<JsonWebKey>(token.ToString());
                    return await Task.FromResult(key);
                }
            }

            return null;
        }

        /// </inheritdoc>
        public KeyVaultClient GetKeyVaultClient()
        {
            throw new NotSupportedException();
        }

        /// </inheritdoc>
        public async Task<string> GetSecretAsync(string secretId)
        {
            string path = Path.Combine(Directory.GetCurrentDirectory(), @"secrets.json");
            if (File.Exists(path))
            {
                string jsonString = File.ReadAllText(path);
                JObject keyVault = JObject.Parse(jsonString);
                keyVault.TryGetValue(secretId, out JToken token);
                return token != null ? token.ToString() : string.Empty;
            }

            return await Task.FromResult(string.Empty);
        }
    }
}
