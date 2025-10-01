using Microsoft.Extensions.Options;

namespace Altinn.Codelists.Posten.Clients;

internal sealed class PostalCodesHttpClient(HttpClient _httpClient, IOptions<PostenSettings> _options)
    : IPostalCodesClient
{
    private readonly Uri _uri = new(_options.Value.Url);

    public async Task<List<PostalCodeRecord>> GetPostalCodes()
    {
        using var response = await _httpClient.GetAsync(_uri.ToString(), HttpCompletionOption.ResponseHeadersRead);
        await using var responseStream = await response.Content.ReadAsStreamAsync();

        var parser = new PostalCodesCsvParser(responseStream);
        List<PostalCodeRecord> result = await parser.Parse();

        return result;
    }
}
