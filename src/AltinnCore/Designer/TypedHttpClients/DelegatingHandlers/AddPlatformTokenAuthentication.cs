using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.Rest.TransientFaultHandling;

namespace AltinnCore.Designer.TypedHttpClients.DelegatingHandlers
{
    /// <summary>
    /// Adds an access token to the request Authorization header as a Bearer
    /// </summary>
    public class AddPlatformTokenAuthentication : DelegatingHandler
    {
        private readonly GeneralSettings _generalSettings;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="options">IOptionsMonitor of type GeneralSettings</param>
        public AddPlatformTokenAuthentication(IOptionsMonitor<GeneralSettings> options)
        {
            _generalSettings = options.CurrentValue;
        }

        /// <summary>
        /// Adds a Bearer token to the request
        /// </summary>
        /// <param name="request">System.Net.Http.HttpResponseMessage</param>
        /// <param name="cancellationToken">System.Threading.CancellationToken</param>
        /// <returns>HttpResponseMessage</returns>
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {

            return await base.SendAsync(request, cancellationToken);
        }
    }
}
