using Microsoft.Azure.KeyVault;
using Microsoft.IdentityModel.Clients.ActiveDirectory;

namespace AltinnCore.Authentication.Constants
{
    /// <summary>
    /// The key vault settings used to fetch certificate information from key vault
    /// </summary>
    public class KeyVaultSettings
    {
        /// <summary>
        /// The key vault reader client id
        /// </summary>
        public string ClientId { get; set; }

        /// <summary>
        /// The key vault client secret
        /// </summary>
        public string ClientSecret { get; set; }

        /// <summary>
        /// The key vault tenant Id
        /// </summary>
        public string TenantId { get; set; }

        /// <summary>
        /// The uri to the key vault
        /// </summary>
        public string SecretUri { get; set; }

        /// <summary>
        /// Creates the client used to connect to key vault
        /// </summary>
        /// <param name="clientId">The key vault client id</param>
        /// <param name="clientSecret">The key vault client secret</param>
        public static KeyVaultClient GetClient(string clientId, string clientSecret) => new KeyVaultClient(new KeyVaultClient.AuthenticationCallback(async (string authority, string resource, string scope) =>
        {
            AuthenticationContext context = new AuthenticationContext(authority, TokenCache.DefaultShared);
            ClientCredential clientCred = new ClientCredential(clientId, clientSecret);
            AuthenticationResult authResult = await context.AcquireTokenAsync(resource, clientCred);
            return authResult.AccessToken;
        }));
    }

    /// <summary>
    /// The certificate settings
    /// </summary>
    public class CertificateSettings
    {
        /// <summary>
        /// The name of the certificate
        /// </summary>
        public string CertificateName { get; set; }

        /// <summary>
        /// The password of the certificate
        /// </summary>
        public string CertificatePwd { get; set; }

        /// <summary>
        /// The path to the certificate
        /// </summary>
        public string CertificatePath { get; set; }
    }
}
