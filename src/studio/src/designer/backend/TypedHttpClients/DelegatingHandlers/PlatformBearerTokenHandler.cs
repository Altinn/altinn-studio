using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.Authentication;
using Altinn.Studio.Designer.TypedHttpClients.AltinnAuthentication;
using Altinn.Studio.Designer.TypedHttpClients.Maskinporten;

namespace Altinn.Studio.Designer.TypedHttpClients.DelegatingHandlers
{
    /// <summary>
    /// Adds a Bearer token to the Authorization header
    /// </summary>
    public class PlatformBearerTokenHandler : DelegatingHandler
    {
        private readonly IAltinnAuthenticationClient _altinnAuthenticationClient;
        private readonly IMaskinportenClient _maskinportenClient;

        /// <summary>
        /// Constructor
        /// </summary>
        public PlatformBearerTokenHandler(
            IMaskinportenClient maskinportenClient,
            IAltinnAuthenticationClient altinnAuthenticationClient)
        {
            _maskinportenClient = maskinportenClient;
            _altinnAuthenticationClient = altinnAuthenticationClient;
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
            AccessTokenModel maskinportenToken = await _maskinportenClient.CreateToken();
            string altinnToken = await _altinnAuthenticationClient.ConvertTokenAsync(maskinportenToken.AccessToken, request.RequestUri);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", altinnToken);
            return await base.SendAsync(request, cancellationToken);
        }
    }
}
