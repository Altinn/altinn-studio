using Altinn.Codelists.Kartverket.AdministrativeUnits.Models;
using Microsoft.Extensions.Options;

namespace Altinn.Codelists.Kartverket.AdministrativeUnits.Clients;

/// <summary>
/// Http client to get information on norways offical administrative units for counties and communes.
/// </summary>
public class AdministrativeUnitsHttpClient : IAdministrativeUnitsClient
{
    private readonly HttpClient _httpClient;

    /// <summary>
    /// Initializes a new instance of the <see cref="AdministrativeUnitsHttpClient"/> class.
    /// </summary>
    public AdministrativeUnitsHttpClient(IOptions<AdministrativeUnitsOptions> options, HttpClient httpClient)
    {
        _httpClient = httpClient;
        _httpClient.BaseAddress = new Uri(options.Value.BaseApiUrl);
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