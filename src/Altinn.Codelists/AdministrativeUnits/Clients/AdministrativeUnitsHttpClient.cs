using Altinn.Codelists.AdministrativeUnits;
using Altinn.Codelists.AdministrativeUnits.Clients;
using Altinn.Codelists.AdministrativeUnits.Models;
using Microsoft.Extensions.Options;
using System.Text.Json;

namespace Altinn.Codelists
{
    /// <summary>
    /// Http client to get information on norways offical administrative units for counties and communes.
    /// </summary>
    public class AdministrativeUnitsHttpClient : IAdministrativeUnitsClient
    {
        private readonly HttpClient _httpClient;
        private readonly AdministrativeUnitsOptions _options;

        /// <summary>
        /// Initializes a new instance of the <see cref="AdministrativeUnitsHttpClient"/> class.
        /// </summary>
        public AdministrativeUnitsHttpClient(IOptions<AdministrativeUnitsOptions> options, HttpClient httpClient)
        {
            _options = options.Value;
            _httpClient = httpClient;
            _httpClient.BaseAddress = new Uri(_options.BaseApiUrl);
            _httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
        }

        /// <summary>
        /// Sends a asynchronus GET request to get all the counties of Norway.
        /// </summary>
        public async Task<List<County>> GetCounties()
        {
            var response = await _httpClient.GetAsync("fylker");
            var responseJson = await response.Content.ReadAsStringAsync();

            var counties = JsonSerializer.Deserialize<List<County>>(responseJson);

            return counties ?? new List<County>();
        }

        /// <summary>
        /// Sends a asynchronus GET request to get all the communes of Norway.
        /// </summary>
        public async Task<List<Commune>> GetCommunes()
        {
            var response = await _httpClient.GetAsync("kommuner");
            var responseJson = await response.Content.ReadAsStringAsync();

            var communes = JsonSerializer.Deserialize<List<Commune>>(responseJson);

            return communes ?? new List<Commune>();
        }

        /// <summary>
        /// Sends a asynchronus GET request to get all the communes within the specified county.
        /// </summary>
        /// <param name="countyNumber">County number (string) including leading zero's indentifying the county.</param>
        public async Task<List<Commune>> GetCommunes(string countyNumber)
        {
            var response = await _httpClient.GetAsync($"fylker/{countyNumber}?filtrer=kommuner,fylkesnavn,fylkesnummer");
            var responseJson = await response.Content.ReadAsStringAsync();

            var county = JsonSerializer.Deserialize<County>(responseJson);

            return county?.Communes ?? new List<Commune>();
        }
    }
}