using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading;
using System.Threading.Tasks;
using AltinnCore.Designer.Services;

namespace AltinnCore.Designer.TypedHttpClients.DelegatingHandlers
{
    /// <summary>
    /// Adds a Bearer token to the Authorization header
    /// </summary>
    public class PlatformBearerTokenHandler : DelegatingHandler
    {
        private readonly IPlatformAuthenticator _platformAuthenticator;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="platformAuthenticator">IPlatformAuthenticator</param>
        public PlatformBearerTokenHandler(IPlatformAuthenticator platformAuthenticator)
        {
            _platformAuthenticator = platformAuthenticator;
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
            string token = await _platformAuthenticator.GetConvertedTokenAsync();
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return await base.SendAsync(request, cancellationToken);
        }
    }
}
