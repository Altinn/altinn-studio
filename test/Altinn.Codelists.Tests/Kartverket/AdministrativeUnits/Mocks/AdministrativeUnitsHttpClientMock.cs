using Altinn.Codelists.Kartverket.AdministrativeUnits;
using Altinn.Codelists.Kartverket.AdministrativeUnits.Clients;
using Altinn.Codelists.Kartverket.AdministrativeUnits.Models;
using RichardSzalay.MockHttp;

namespace Altinn.Codelists.Tests.Kartverket.AdministrativeUnits.Mocks;

public class AdministrativeUnitsHttpClientMock : IAdministrativeUnitsClient
{
    private const string COUNTIES_TESTDATA_RESOURCE = "Altinn.Codelists.Tests.Kartverket.AdministrativeUnits.Testdata.fylker.json";
    private const string COUNTY_COMMUNES_TESTDATA_RESOURCE = "Altinn.Codelists.Tests.Kartverket.AdministrativeUnits.Testdata.fylke46_kommuner.json";
    private const string COMMUNES_TESTDATA_RESOURCE = "Altinn.Codelists.Tests.Kartverket.AdministrativeUnits.Testdata.kommuner.json";

    private readonly IAdministrativeUnitsClient _administrativeUnitsHttpClient;
    private readonly IOptions<AdministrativeUnitsOptions> _administrativeUnitsOptions;

    public MockHttpMessageHandler HttpMessageHandlerMock { get; private set; }
    public MockedRequest MockedCountiesRequest { get; private set; }
    public MockedRequest MockedCommunesRequest { get; private set; }

    public AdministrativeUnitsHttpClientMock(IOptions<AdministrativeUnitsOptions> administrativeUnitsOptions)
    {
        _administrativeUnitsOptions = administrativeUnitsOptions;

        HttpMessageHandlerMock = new MockHttpMessageHandler();
        MockedCountiesRequest = HttpMessageHandlerMock
            .When("https://ws.geonorge.no/kommuneinfo/v1/fylker")
            .Respond("application/json", EmbeddedResource.LoadDataAsString(COUNTIES_TESTDATA_RESOURCE).Result);

        MockedCommunesRequest = HttpMessageHandlerMock
            .When("https://ws.geonorge.no/kommuneinfo/v1/kommuner")
            .Respond("application/json", EmbeddedResource.LoadDataAsString(COMMUNES_TESTDATA_RESOURCE).Result);

        MockedCommunesRequest = HttpMessageHandlerMock
            .When("https://ws.geonorge.no/kommuneinfo/v1/fylker/46?filtrer=kommuner,fylkesnavn,fylkesnummer")
            .Respond("application/json", EmbeddedResource.LoadDataAsString(COUNTY_COMMUNES_TESTDATA_RESOURCE).Result);

        _administrativeUnitsHttpClient = new AdministrativeUnitsHttpClient(_administrativeUnitsOptions, new HttpClient(HttpMessageHandlerMock));
    }

    public Task<List<County>> GetCounties()
    {
        return _administrativeUnitsHttpClient.GetCounties();
    }

    public Task<List<Commune>> GetCommunes()
    {
        return _administrativeUnitsHttpClient.GetCommunes();
    }

    public Task<List<Commune>> GetCommunes(string countyNumber)
    {
        return _administrativeUnitsHttpClient.GetCommunes(countyNumber);
    }
}
