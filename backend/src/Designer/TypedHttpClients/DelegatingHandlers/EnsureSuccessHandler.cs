using System;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Rest.TransientFaultHandling;

namespace Altinn.Studio.Designer.TypedHttpClients.DelegatingHandlers
{
    /// <summary>
    /// Delegating handler that ensures response success status code
    /// </summary>
    public class EnsureSuccessHandler : DelegatingHandler
    {

        private readonly ILogger<EnsureSuccessHandler> _logger;

        /// <summary>
        /// Constructor to inject logger
        /// </summary>
        /// <param name="logger">ILogger instance</param>
        public EnsureSuccessHandler(ILogger<EnsureSuccessHandler> logger = null)
        {
            _logger = logger;
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
            HttpResponseMessage response = await base.SendAsync(request, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {

                string errorMessage = await response.Content.ReadAsStringAsync();
                string requestContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("// EnsureSuccessHandler // SendAsync // Request to {RequestUri} failed with status code {StatusCode} and message {ResponseMessage}.\r\n Content: {RequestContent}", request.RequestUri, response.StatusCode, errorMessage, requestContent);

                throw new HttpRequestWithStatusException(response.ReasonPhrase)
                {
                    StatusCode = response.StatusCode
                };
            }

            return response;
        }
    }
}
