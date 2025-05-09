using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class OrganisationLookupTests : PreviewControllerTestsBase<OrganisationLookupTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        protected const string organisationNumber = "123456789";

        public OrganisationLookupTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_OrganisationLookup_Ok()
        {
            string dataPathWithData = $"{Org}/{AppV4}/api/v1/lookup/organisation/{organisationNumber}";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={AppV4}&selectedLayoutSet=");

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            Assert.Contains(organisationNumber, responseBody);
            Assert.Contains("Test AS", responseBody);
        }
    }
}
