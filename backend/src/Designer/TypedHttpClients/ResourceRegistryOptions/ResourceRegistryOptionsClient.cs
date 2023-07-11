using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using PolicyAdmin.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.ResourceRegistryOptions
{
    public class ResourceRegistryOptionsClients : IResourceRegistryOptions
    {
        HttpClient _client;

        public ResourceRegistryOptionsClients(HttpClient client)
        {
            _client = client;
        }

        public async Task<EuroVocTerms> GetEuroVocTerms()
        {
            string url = "https://data.norge.no/reference-data/eu/eurovocs";

            EuroVocTerms eurovoc;

            try
            {
                HttpResponseMessage response = await _client.GetAsync(url);
                string content = await response.Content.ReadAsStringAsync();
                eurovoc = System.Text.Json.JsonSerializer.Deserialize<EuroVocTerms>(content, new System.Text.Json.JsonSerializerOptions() { PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase });
                return eurovoc;
            }
            catch (Exception ex)
            {
                throw new Exception($"Something went wrong when retrieving eurovocs", ex);
            }
        }

        public async Task<LosTerms> GetLosTerms()
        {
            string url = "https://data.norge.no/reference-data/los/themes-and-words";

            LosTerms losTerms;

            try
            {
                HttpResponseMessage response = await _client.GetAsync(url);
                string content = await response.Content.ReadAsStringAsync();
                losTerms = System.Text.Json.JsonSerializer.Deserialize<LosTerms>(content, new System.Text.Json.JsonSerializerOptions() { PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase });
                return losTerms;
            }
            catch (Exception ex)
            {
                throw new Exception($"Something went wrong when retrieving los terms", ex);
            }
        }

        public async Task<DataThemesContainer> GetSectors()
        {
            string url = "https://data.norge.no/reference-data/eu/data-themes";

            DataThemesContainer dataThemes;

            try
            {
                HttpResponseMessage response = await _client.GetAsync(url);
                string sectorscontent = await response.Content.ReadAsStringAsync();
                dataThemes = System.Text.Json.JsonSerializer.Deserialize<DataThemesContainer>(sectorscontent, new System.Text.Json.JsonSerializerOptions() { PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase });
                return dataThemes;
            }
            catch (Exception ex)
            {
                throw new Exception($"Something went wrong when retrieving sectors data themes", ex);
            }
        }
    }
}
