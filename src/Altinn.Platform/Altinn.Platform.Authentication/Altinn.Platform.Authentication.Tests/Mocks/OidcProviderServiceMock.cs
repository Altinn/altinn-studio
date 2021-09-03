using System.Threading.Tasks;
using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authentication.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Authentication.Services
{
    /// <summary>
    /// Oidc provider for mocking OIDC Providers
    /// </summary>
    public class OidcProviderServiceMock : IOidcProvider
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="OidcProviderServiceMock"/> class.
        /// </summary>
        public OidcProviderServiceMock()
        {
        }

        /// <summary>
        /// Performs a AccessToken Request as described in https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3
        /// </summary>
        public Task<OidcCodeResponse> GetTokens(string authorizationCode, OidcProvider provider, string redirect_uri)
        {
            OidcCodeResponse codeResponse = new OidcCodeResponse();
            codeResponse.AccessToken = authorizationCode;
            codeResponse.IdToken = authorizationCode;
            return Task.FromResult(codeResponse);
        }
    }
}
