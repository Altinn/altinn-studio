using Altinn.Codelists.Posten;
using Altinn.Codelists.Posten.Clients;
using RichardSzalay.MockHttp;

namespace Altinn.Codelists.Tests.Posten.Mocks;

public class PostalCodesHttpClientMock : IPostalCodesClient
{
    private const string POSTAL_CODES_TESTDATA_RESOURCE =
        "Altinn.Codelists.Tests.Posten.Testdata.Postnummerregister-ansi.txt";

    private readonly IPostalCodesClient _client;

    public MockHttpMessageHandler HttpMessageHandlerMock { get; private set; }

    public PostalCodesHttpClientMock()
    {
        HttpMessageHandlerMock = new MockHttpMessageHandler();

        HttpMessageHandlerMock
            .When("https://www.bring.no/postnummerregister-ansi.txt")
            .Respond("text/plain", EmbeddedResource.LoadDataAsString(POSTAL_CODES_TESTDATA_RESOURCE).Result);

        _client = new PostalCodesHttpClient(new HttpClient(HttpMessageHandlerMock));
    }

    public async Task<List<PostalCodeRecord>> GetPostalCodes()
    {
        return await _client.GetPostalCodes();
    }
}
