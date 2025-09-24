#nullable enable
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Authentication.Configuration;
using Microsoft.Extensions.Options;

namespace LocalTest.Clients.CdnAltinnOrgs;

/// <summary>
/// Access data from https://altinncdn.no/orgs/altinn-orgs.json
/// </summary>
public class AltinnOrgsClient
{
    private static JsonSerializerOptions JSON_OPTIONS = new JsonSerializerOptions(JsonSerializerDefaults.Web);
    private readonly HttpClient _client;
    private readonly GeneralSettings _authOptions;

    public AltinnOrgsClient(HttpClient client, IOptions<GeneralSettings> authOptions)
    {
        _client = client;
        _authOptions = authOptions.Value;
    }

    public async Task<CdnOrgs> GetCdnOrgs()
    {
        var orgsJson = await _client.GetByteArrayAsync(_authOptions.GetOrganisationRepositoryLocation);
        return JsonSerializer.Deserialize<CdnOrgs>(orgsJson, JSON_OPTIONS) ?? throw new JsonException("altinn-orgs respones was \"null\"");
    }
}
