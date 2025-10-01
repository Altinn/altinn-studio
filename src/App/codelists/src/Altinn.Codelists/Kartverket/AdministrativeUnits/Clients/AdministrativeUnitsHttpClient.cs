using Altinn.Codelists.Kartverket.AdministrativeUnits.Models;
using Microsoft.Extensions.Options;

namespace Altinn.Codelists.Kartverket.AdministrativeUnits.Clients;

/// <summary>
/// Http client to get information on norways offical administrative units for counties and municipalities .
/// </summary>
internal sealed class AdministrativeUnitsHttpClient : IAdministrativeUnitsClient
{
    private readonly HttpClient _httpClient;

    /// <summary>
    /// Initializes a new instance of the <see cref="AdministrativeUnitsHttpClient"/> class.
    /// </summary>
    public AdministrativeUnitsHttpClient(IOptions<AdministrativeUnitsSettings> settings, HttpClient httpClient)
    {
        _httpClient = httpClient;
        _httpClient.BaseAddress = new Uri(settings.Value.BaseApiUrl);
        _httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
    }

    /// <summary>
    /// Sends a asynchronus GET request to get all the counties of Norway.
    /// </summary>
    public async Task<List<County>> GetCounties()
    {
        using var response = await _httpClient.GetAsync("fylker");
        var responseJson = await response.Content.ReadAsStringAsync();

        var counties = JsonSerializer.Deserialize<List<County>>(responseJson);

        return counties ?? new List<County>();
    }

    /// <summary>
    /// Sends a asynchronus GET request to get all the unicipalities of Norway.
    /// </summary>
    public async Task<List<Municipality>> GetMunicipalities()
    {
        using var response = await _httpClient.GetAsync("kommuner");
        var responseJson = await response.Content.ReadAsStringAsync();

        var municipalities = JsonSerializer.Deserialize<List<Municipality>>(responseJson);

        return municipalities ?? new List<Municipality>();
    }

    /// <summary>
    /// Sends a asynchronus GET request to get all the municipalities within the specified county.
    /// </summary>
    /// <param name="countyNumber">County number (string) including leading zero's indentifying the county.</param>
    public async Task<List<Municipality>> GetMunicipalities(string countyNumber)
    {
        using var response = await _httpClient.GetAsync(
            $"fylker/{countyNumber}?filtrer=kommuner,fylkesnavn,fylkesnummer"
        );
        var responseJson = await response.Content.ReadAsStringAsync();

        var county = JsonSerializer.Deserialize<County>(responseJson);

        return county?.Municipalities ?? new List<Municipality>();
    }
}
