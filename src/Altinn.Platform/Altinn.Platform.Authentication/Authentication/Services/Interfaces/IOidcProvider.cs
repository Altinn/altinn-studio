using System.Threading.Tasks;
using Altinn.Platform.Authentication.Model;

namespace Altinn.Platform.Authentication.Services.Interfaces
{
    /// <summary>
    /// Interface for communicating
    /// </summary>
    public interface IOidcProvider
    {
        /// <summary>
        /// Get code response from OIDC Proviver. Respons will be different based on the type of original login request
        /// </summary>
        Task<OidcCodeResponse> GetTokens(string authorizationCode, OidcProvider provider);
    }
}
