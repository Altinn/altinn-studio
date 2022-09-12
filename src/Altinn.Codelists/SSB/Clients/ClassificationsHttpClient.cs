using Altinn.Codelists.SSB.Models;
using System.Text.Json;

namespace Altinn.Codelists.SSB.Clients
{
    public class ClassificationsHttpClient
    {
        private readonly HttpClient _httpClient;
        private readonly string _baseUrl = "http://data.ssb.no/api/klass/v1/classifications/";

        public ClassificationsHttpClient(HttpClient httpClient)
        {
            _httpClient = httpClient;
            _httpClient.BaseAddress = new Uri(_baseUrl);
            _httpClient.DefaultRequestHeaders.Add("Accept", "application/json;charset=utf-8");
        }

        public async Task<ClassificationCodes> GetClassificationCodes(Classification classification)
        {
            int classificationNumber = (int)classification;
            string fromDate = DateOnly.FromDateTime(DateTime.Today).ToString("yyyy-MM-dd");
            var response = await _httpClient.GetAsync($"{classificationNumber.ToString()}/codes?from={fromDate}");
            var responseJson = await response.Content.ReadAsStringAsync();

            var classificationCodes = JsonSerializer.Deserialize<ClassificationCodes>(responseJson);

            return classificationCodes ?? new ClassificationCodes();
        }
    }
}
