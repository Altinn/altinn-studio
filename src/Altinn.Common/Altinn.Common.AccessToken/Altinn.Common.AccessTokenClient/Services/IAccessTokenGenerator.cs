using System.Security.Cryptography.X509Certificates;

namespace Altinn.Common.AccessTokenClient.Services
{
    /// <summary>
    /// Access token generator interface
    /// </summary>
    public interface IAccessTokenGenerator
    {
        /// <summary>
        /// Generates a access token for apps needing to access platform components.
        /// </summary>
        /// <param name="issuer">Can be a app or platform component</param>
        /// <param name="app">The application creating token (app or component)</param>
        /// <returns>Accesstoken</returns>
        string GenerateAccessToken(string issuer, string app);

        /// <summary>
        /// Generates a access token for anyone needing to access platform components.
        /// </summary>
        /// <param name="issuer">Can be a app, function or platform component</param>
        /// <param name="app">The application creating token (app or component)</param>
        /// <param name="certificate">Certificate to generate SigningCredentials</param>
        /// <returns>Accesstoken</returns>
        string GenerateAccessToken(string issuer, string app, X509Certificate2 certificate);
    }
}
