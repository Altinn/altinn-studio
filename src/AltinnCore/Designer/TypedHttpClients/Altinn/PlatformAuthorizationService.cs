using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace AltinnCore.Designer.TypedHttpClients.Altinn
{
    /// <summary>
    /// Service to communicate with Authorization component
    /// </summary>
    public class PlatformAuthorizationService : IPlatformAuthorizationService
    {
        private readonly HttpClient _httpClient;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="httpClient">HttpClient</param>
        public PlatformAuthorizationService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        /// <inheritdoc/>
        public async Task SavePolicy(string org, string app, string policy)
        {
            StringContent value = new StringContent(policy, Encoding.UTF8, "application/json");
            await _httpClient.PostAsync($"policies?org={org}&app={app}", value);
        }
    }
}
