#nullable enable
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

namespace LocalTest.Clients.CdnAltinnOrgs;

/// <summary>
/// Access data from https://altinncdn.no/orgs/altinn-orgs.json
/// </summary>
public class AltinnOrgsClient
{
    private static JsonSerializerOptions JSON_OPTIONS = new JsonSerializerOptions(JsonSerializerDefaults.Web);
    private readonly HttpClient _client;

    public AltinnOrgsClient(HttpClient client)
    {
        _client = client;
    }

    public async Task<CdnOrgs> GetCdnOrgs()
    {
        var orgsJson = await _client.GetByteArrayAsync("https://altinncdn.no/orgs/altinn-orgs.json");
        return JsonSerializer.Deserialize<CdnOrgs>(orgsJson, JSON_OPTIONS) ?? throw new JsonException("altinn-orgs respones was \"null\"");
    }
}
