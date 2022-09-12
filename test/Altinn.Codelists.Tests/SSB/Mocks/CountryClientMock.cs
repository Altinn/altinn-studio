using Altinn.Codelists.Countries.Models;
using RichardSzalay.MockHttp;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Altinn.Codelists.Tests.SSB.Mocks
{
    public class CountryClientMock : ICountryClient
    {
        private const string COUNTIES_TESTDATA_RESOURCE = "Altinn.Codelists.Tests.Countries.Testdata.fylker.json";

        public MockHttpMessageHandler HttpMessageHandlerMock { get; private set; }
        public MockedRequest MockedCountiesRequest { get; private set; }
        public MockedRequest MockedCommunesRequest { get; private set; }

        public CountryClientMock()
        {
            HttpMessageHandlerMock = new MockHttpMessageHandler();
            MockedCountiesRequest = HttpMessageHandlerMock
                .When("https://ws.geonorge.no/kommuneinfo/v1/fylker")
                .Respond("application/json", EmbeddedResource.LoadDataAsString(COUNTIES_TESTDATA_RESOURCE).Result);
        }

        public Task<List<Country>> GetAllCountries()
        {
            throw new NotImplementedException();
        }
    }
}
