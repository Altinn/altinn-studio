namespace Altinn.Common.AccessTokenClient.Services
{
    /// <summary>
    /// Access token generator interface
    /// </summary>
    public interface IAccessTokenGenerator
    {
        /// <summary>
        /// Generates a access token
        /// </summary>
        /// <param name="issuer">The issuer</param>
        /// <param name="app">The application id</param>
        /// <returns></returns>
        string GenerateAccessToken(string issuer, string app);

        /// <summary>
        /// Generates a access token for apps/functions needing to access platform components.
        /// </summary>
        /// <param name="issuer">Can be a app or platform component</param>
        /// <param name="app">The application creating token (app or component)</param>
        /// <param name="keyVaultUri">Uri to keyvault</param>
        /// <param name="secretId">Id to the certificate in keyvault</param>
        /// <returns>Accesstoken</returns>
        string GenerateAccessToken(string issuer, string app, string keyVaultUri, string secretId);
    }
}
