using Microsoft.IdentityModel.Tokens;

namespace Altinn.Common.AccessTokenClient.Services
{
    /// <summary>
    /// Interface to retrive signing credentials for issuer and signing keys for consumer of tokens
    /// </summary>
    public interface ISigningCredentialsResolver
    {
        /// <summary>
        /// Returns certificat to be used for signing a JWT
        /// </summary>
        /// <returns>The signing credentials</returns>
        SigningCredentials GetSigningCredentials();

        /// <summary>
        /// Returns certificat to be used for signing a JWT
        /// </summary>
        /// <param name="keyVaultUri">Uri to KeyVault</param>
        /// <param name="secretId">Id to certificate in KeyVault</param>
        /// <returns>The signing credentials</returns>
        SigningCredentials GetSigningCredentials(string keyVaultUri, string secretId);
    }
}
