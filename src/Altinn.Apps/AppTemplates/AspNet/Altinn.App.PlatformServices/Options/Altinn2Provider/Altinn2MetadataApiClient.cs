#nullable enable
using System.Net.Http;
using System.Threading.Tasks;

namespace Altinn.App.PlatformServices.Options.Altinn2Provider
{
    public class Altinn2MetadataApiClient
    {
        private readonly HttpClient _client;
        public Altinn2MetadataApiClient(HttpClient client)
        {
            _client = client;
        }
        public async Task<MetadataCodelistResponse> GetAltinn2Codelist(string id, string langCode, int? version = null)
        {
            var response = await _client.GetAsync($"https://www.altinn.no/api/metadata/codelists/{id}/{version?.ToString()??string.Empty}?language={langCode}");
            response.EnsureSuccessStatusCode();
            var codelist = await response.Content.ReadAsAsync<MetadataCodelistResponse>();
            return codelist;
        }
    }
}
