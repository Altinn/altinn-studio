using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Studio.Designer.TypedHttpClients.AltinnAuthentication;

namespace Altinn.Studio.Designer.TypedHttpClients.DelegatingHandlers
{
    /// <summary>
    /// Adds a Bearer token to the Authorization header
    /// </summary>
    public class PlatformBearerTokenHandler : DelegatingHandler
    {
        private readonly IAltinnAuthenticationClient _altinnAuthenticationClient;
        private readonly IAccessTokenGenerator _accesTokenGenerator;
        private const string AccessTokenIssuer = "studio";
        private const string AccessTokenApp = "studio.designer";

        /// <summary>
        /// Constructor
        /// </summary>
        public PlatformBearerTokenHandler(
            IAccessTokenGenerator accessTokenGenerator,
            IAltinnAuthenticationClient altinnAuthenticationClient)
        {
            _altinnAuthenticationClient = altinnAuthenticationClient;
            _accesTokenGenerator = accessTokenGenerator;
        }

        /// <summary>
        /// Checks to see if response is success
        /// Otherwise, throws Exception
        /// </summary>
        /// <param name="request">System.Net.Http.HttpResponseMessage</param>
        /// <param name="cancellationToken">System.Threading.CancellationToken</param>
        /// <returns>HttpResponseMessage</returns>
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            string designerToken = _accesTokenGenerator.GenerateAccessToken(AccessTokenIssuer, AccessTokenApp);
            string altinnToken = await _altinnAuthenticationClient.ConvertTokenAsync(designerToken, request.RequestUri);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", altinnToken);
            return await base.SendAsync(request, cancellationToken);
        }
    }
}
