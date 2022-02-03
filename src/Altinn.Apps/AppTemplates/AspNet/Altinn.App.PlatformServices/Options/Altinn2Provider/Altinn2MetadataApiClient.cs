#nullable enable
using System.Net.Http;
using System.Threading.Tasks;

namespace Altinn.App.PlatformServices.Options.Altinn2Provider
{
    /// <summary>
    /// HttpClientWrapper for the altinn2 metadata/codelists api
    /// </summary>
    public class Altinn2MetadataApiClient
    {
        /// <summary>
        /// HttpClient
        /// </summary>
        private readonly HttpClient _client;

        /// <summary>
        /// Constructor
        /// </summary>
        public Altinn2MetadataApiClient(HttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// Fetch the code list
        /// </summary>
        /// <param name="id">id of the code list</param>
        /// <param name="langCode">Language code per altinn2 definisions (nb=>1044, ...)</param>
        /// <param name="version">The version number for the list in the api</param>
        public async Task<MetadataCodelistResponse> GetAltinn2Codelist(string id, string langCode, int? version = null)
        {
            var response = await _client.GetAsync($"https://www.altinn.no/api/metadata/codelists/{id}/{version?.ToString() ?? string.Empty}?language={langCode}");
            response.EnsureSuccessStatusCode();
            var codelist = await response.Content.ReadAsAsync<MetadataCodelistResponse>();
            return codelist;
        }
    }
}
