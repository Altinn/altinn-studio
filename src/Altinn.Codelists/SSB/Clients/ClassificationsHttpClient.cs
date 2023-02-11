using Altinn.Codelists.SSB.Models;
using Microsoft.Extensions.Options;

namespace Altinn.Codelists.SSB.Clients;

/// <summary>
/// Http client to get classification codes from SSB.
/// </summary>
public class ClassificationsHttpClient : IClassificationsClient
{
    private readonly HttpClient _httpClient;

    /// <summary>
    /// Initializes a new instance of the <see cref="ClassificationsHttpClient"/> class.
    /// </summary>
    public ClassificationsHttpClient(IOptions<ClassificationSettings> settings, HttpClient httpClient)
    {
        _httpClient = httpClient;
        _httpClient.BaseAddress = new Uri(settings.Value.BaseApiUrl);
        _httpClient.DefaultRequestHeaders.Add("Accept", "application/json;charset=utf-8");
    }

    /// <summary>
    /// Gets the codes for the specified classification.
    /// </summary>
    /// <param name="classification">The type of classification to get</param>
    /// <param name="language">The language code used for the labels. Valid options are nb (norsk bokmål), nn (nynorsk) and en (english)
    /// Default if nothing is specified is nb (norsk bokmål).
    /// </param>
    /// <param name="atDate">The date the classification should be valid</param>
    /// <returns></returns>
    public async Task<ClassificationCodes> GetClassificationCodes(Classification classification, string language="nb", DateOnly? atDate = null)
    {
        int classificationNumber = (int)classification;
        DateOnly date = atDate ?? DateOnly.FromDateTime(DateTime.Today);
        string atDateformatted = date.ToString("yyyy-MM-dd");
        
        var response = await _httpClient.GetAsync($"{classificationNumber}/codesAt?date={atDateformatted}&language={language}");
        var responseJson = await response.Content.ReadAsStringAsync();

        var classificationCodes = JsonSerializer.Deserialize<ClassificationCodes>(responseJson);

        return classificationCodes ?? new ClassificationCodes();
    }
}
