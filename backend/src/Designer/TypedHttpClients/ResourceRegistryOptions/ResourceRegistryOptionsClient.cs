using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.ResourceRegistryOptions
{
    public class ResourceRegistryOptionsClients : IResourceRegistryOptions
    {
        HttpClient _client;

        private readonly JsonSerializerOptions _dataNorgeSerilizerOptions = new System.Text.Json.JsonSerializerOptions() { PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase };

        public ResourceRegistryOptionsClients(HttpClient client)
        {
            _client = client;
        }

        public async Task<EuroVocTerms> GetEuroVocTerms(CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            string url = "https://data.norge.no/reference-data/eu/eurovocs";

            EuroVocTerms eurovoc;

            try
            {
                HttpResponseMessage response = await _client.GetAsync(url, cancellationToken);
                string content = await response.Content.ReadAsStringAsync(cancellationToken);
                eurovoc = System.Text.Json.JsonSerializer.Deserialize<EuroVocTerms>(content, _dataNorgeSerilizerOptions);
                return eurovoc;
            }
            catch (Exception ex)
            {
                throw new Exception($"Something went wrong when retrieving eurovocs", ex);
            }
        }

        public async Task<LosTerms> GetLosTerms(CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            string url = "https://data.norge.no/reference-data/los/themes-and-words";

            LosTerms losTerms;

            try
            {
                HttpResponseMessage response = await _client.GetAsync(url, cancellationToken);
                string content = await response.Content.ReadAsStringAsync(cancellationToken);
                losTerms = System.Text.Json.JsonSerializer.Deserialize<LosTerms>(content, _dataNorgeSerilizerOptions);
                return losTerms;
            }
            catch (Exception ex)
            {
                throw new Exception($"Something went wrong when retrieving los terms", ex);
            }
        }

        public async Task<DataThemesContainer> GetSectors(CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            string url = "https://data.norge.no/reference-data/eu/data-themes";

            DataThemesContainer dataThemes;

            try
            {
                HttpResponseMessage response = await _client.GetAsync(url, cancellationToken);
                string sectorscontent = await response.Content.ReadAsStringAsync(cancellationToken);
                dataThemes = System.Text.Json.JsonSerializer.Deserialize<DataThemesContainer>(sectorscontent, _dataNorgeSerilizerOptions);
                return dataThemes;
            }
            catch (Exception ex)
            {
                throw new Exception($"Something went wrong when retrieving sectors data themes", ex);
            }
        }
    }
}
