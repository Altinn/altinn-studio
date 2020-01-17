using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Rest.TransientFaultHandling;

namespace Altinn.Studio.Designer.TypedHttpClients.DelegatingHandlers
{
    /// <summary>
    /// Delegating handler that ensures response success status code
    /// </summary>
    public class EnsureSuccessHandler : DelegatingHandler
    {
        /// <summary>
        /// Checks to see if response is success
        /// Otherwise, throws Exception
        /// </summary>
        /// <param name="request">System.Net.Http.HttpResponseMessage</param>
        /// <param name="cancellationToken">System.Threading.CancellationToken</param>
        /// <returns>HttpResponseMessage</returns>
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            HttpResponseMessage response = await base.SendAsync(request, cancellationToken);

            // Conflict (409) from Gitea when creating existing repo
            if (!response.IsSuccessStatusCode && response.StatusCode != HttpStatusCode.Conflict)
            {
                throw new HttpRequestWithStatusException(response.ReasonPhrase)
                {
                    StatusCode = response.StatusCode
                };
            }

            return response;
        }
    }
}
