using Altinn.Codelists.SSB;
using Altinn.Codelists.SSB.Clients;
using Altinn.Codelists.SSB.Models;
using RichardSzalay.MockHttp;

namespace Altinn.Codelists.Tests.SSB.Mocks;

public class ClassificationsHttpClientMock : IClassificationsClient
{
    private const string SEX_TESTDATA_RESOURCE = "Altinn.Codelists.Tests.SSB.Testdata.sex.json";
    private const string INDUSTRY_GROUPING_TESTDATA_RESOURCE = "Altinn.Codelists.Tests.SSB.Testdata.industryGrouping.json";
    private const string OCCUPATIONS_TESTDATA_RESOURCE = "Altinn.Codelists.Tests.SSB.Testdata.occupations.json";
    private const string MARITAL_STATUS_TESTDATA_RESOURCE = "Altinn.Codelists.Tests.SSB.Testdata.maritalStatus.json";
    private const string BASE_AMOUT_NATIONAL_INSURANCE_TESTDATA_RESOURCE = "Altinn.Codelists.Tests.SSB.Testdata.baseAmountNationalInsurance.json";
    private const string COUNTIES_TESTDATA_RESOURCE = "Altinn.Codelists.Tests.SSB.Testdata.counties.json";
    private const string MUNICIPALITIES_TESTDATA_RESOURCE = "Altinn.Codelists.Tests.SSB.Testdata.municipalities.json";
    private const string COUNTRIES_TESTDATA_RESOURCE = "Altinn.Codelists.Tests.SSB.Testdata.countries.json";
    private const string SMALL_GAME_VARIANT_TESTDATA_RESOURCE = "Altinn.Codelists.Tests.SSB.Testdata.smallGame_Variant.json";
    
    private readonly IClassificationsClient _client;
    private readonly IOptions<ClassificationSettings> _options;

    public MockHttpMessageHandler HttpMessageHandlerMock { get; private set; }
    public MockedRequest MockedClassificationsRequest { get; private set; }
    public MockedRequest MockedMaritalStatusRequest { get; private set; }

    public ClassificationsHttpClientMock(IOptions<ClassificationSettings> classificationOptions)
    {
        _options = classificationOptions;

        HttpMessageHandlerMock = new MockHttpMessageHandler();

        HttpMessageHandlerMock
            .When("http://data.ssb.no/api/klass/v1/classifications/2/*")
            .Respond("application/json", EmbeddedResource.LoadDataAsString(SEX_TESTDATA_RESOURCE).Result);

        HttpMessageHandlerMock
           .When("http://data.ssb.no/api/klass/v1/classifications/6/*")
           .Respond("application/json", EmbeddedResource.LoadDataAsString(INDUSTRY_GROUPING_TESTDATA_RESOURCE).Result);

        HttpMessageHandlerMock
            .When("http://data.ssb.no/api/klass/v1/classifications/7/*")
            .Respond("application/json", EmbeddedResource.LoadDataAsString(OCCUPATIONS_TESTDATA_RESOURCE).Result);

        MockedMaritalStatusRequest = HttpMessageHandlerMock
            .When("http://data.ssb.no/api/klass/v1/classifications/19/*")
            .Respond("application/json", EmbeddedResource.LoadDataAsString(MARITAL_STATUS_TESTDATA_RESOURCE).Result);
        
        MockedClassificationsRequest = HttpMessageHandlerMock
            .When("http://data.ssb.no/api/klass/v1/classifications/20/*")
            .Respond("application/json", EmbeddedResource.LoadDataAsString(BASE_AMOUT_NATIONAL_INSURANCE_TESTDATA_RESOURCE).Result);

        HttpMessageHandlerMock
            .When("http://data.ssb.no/api/klass/v1/classifications/104/*")
            .Respond("application/json", EmbeddedResource.LoadDataAsString(COUNTIES_TESTDATA_RESOURCE).Result);
        HttpMessageHandlerMock
            .When("http://data.ssb.no/api/klass/v1/classifications/131/*")
            .Respond("application/json", EmbeddedResource.LoadDataAsString(MUNICIPALITIES_TESTDATA_RESOURCE).Result);

        HttpMessageHandlerMock
            .When("http://data.ssb.no/api/klass/v1/classifications/552/*")
            .Respond("application/json", EmbeddedResource.LoadDataAsString(COUNTRIES_TESTDATA_RESOURCE).Result);

        HttpMessageHandlerMock
            .When("http://data.ssb.no/api/klass/v1/classifications/74/variantAt*")
            .Respond("application/json", EmbeddedResource.LoadDataAsString(SMALL_GAME_VARIANT_TESTDATA_RESOURCE).Result);

        _client = new ClassificationsHttpClient(_options, new HttpClient(HttpMessageHandlerMock));
    }

    public async Task<ClassificationCodes> GetClassificationCodes(int classificationId, string language = "nb", DateOnly? atDate = null, string level = "", string variant = "", string selectCodes = "")
    {
        ClassificationCodes classificationCodes = await _client.GetClassificationCodes(classificationId, language, atDate, level, variant, selectCodes);

        return level == string.Empty
            ? classificationCodes
            : new ClassificationCodes() { Codes = classificationCodes.Codes.Where(x => x.Level == level.ToString()).ToList() };
    }
}
