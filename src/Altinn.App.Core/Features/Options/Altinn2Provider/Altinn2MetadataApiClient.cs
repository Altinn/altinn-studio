using System.Globalization;
using Altinn.App.Core.Helpers;

namespace Altinn.App.Core.Features.Options.Altinn2Provider;

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
        var response = await _client.GetAsync(
            $"https://www.altinn.no/api/metadata/codelists/{id}/{version?.ToString(CultureInfo.InvariantCulture) ?? string.Empty}?language={langCode}"
        );
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            response = await _client.GetAsync(
                $"https://www.altinn.no/api/metadata/codelists/{id}/{version?.ToString(CultureInfo.InvariantCulture) ?? string.Empty}"
            );
        }
        response.EnsureSuccessStatusCode();
        var codelist = await JsonSerializerPermissive.DeserializeAsync<MetadataCodelistResponse>(response.Content);
        return codelist;
    }
}
