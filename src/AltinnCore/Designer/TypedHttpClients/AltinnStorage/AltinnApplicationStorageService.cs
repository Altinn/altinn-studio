using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;

namespace AltinnCore.Designer.TypedHttpClients.AltinnStorage
{
    /// <summary>
    /// AltinnApplicationStorageService
    /// </summary>
    public class AltinnApplicationStorageService : IAltinnApplicationStorageService
    {
        private readonly HttpClient _httpClient;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="httpClient">HttpClient</param>
        public AltinnApplicationStorageService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        /// <inheritdoc />
        public async Task<Application> GetAsync(string org, string app)
        {
            HttpResponseMessage response = await _httpClient.GetAsync($"{org}/{app}");
            return await response.Content.ReadAsAsync<Application>();
        }

        /// <inheritdoc />
        public async Task UpdateAsync(string org, string app, Application application)
        {
            await _httpClient.PutAsJsonAsync($"{org}/{app}", application);
        }

        /// <inheritdoc />
        public async Task<Application> CreateAsync(string org, string app, Application application)
        {
            HttpResponseMessage response = await _httpClient.PostAsJsonAsync($"?appId={org}/{app}", application);
            return await response.Content.ReadAsAsync<Application>();
        }
    }
}
