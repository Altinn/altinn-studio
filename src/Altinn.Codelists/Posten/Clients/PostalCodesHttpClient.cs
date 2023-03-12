using Altinn.Codelists.Kartverket.AdministrativeUnits.Models;
using Altinn.Codelists.SSB.Clients;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Altinn.Codelists.Posten.Clients;

/// <summary>
/// Client for getting the offical list of post codes in Norway.
/// </summary>
public class PostalCodesHttpClient : IPostalCodesClient
{
    private readonly HttpClient _httpClient;
    private readonly Uri _uri;

    /// <summary>
    /// Creates a instance of <see cref="PostalCodesHttpClient"/>
    /// </summary>
    /// <param name="httpClient"></param>
    public PostalCodesHttpClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
        _uri = new Uri("https://www.bring.no/postnummerregister-ansi.txt");
    }

    /// <summary>
    /// Gets all postal codes
    /// </summary>
    public async Task<List<PostalCodeRecord>> GetPostalCodes()
    {
        var response = await _httpClient.GetAsync(_uri.ToString());
        var responseStream = await response.Content.ReadAsStreamAsync();

        var parser = new PostalCodesCsvParser(responseStream);
        List<PostalCodeRecord> result = await parser.Parse();

        return result;
    }
}
