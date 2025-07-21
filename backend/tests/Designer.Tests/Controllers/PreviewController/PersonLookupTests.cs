using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class PersonLookupTests : PreviewControllerTestsBase<PersonLookupTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public PersonLookupTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Post_PersonLookup_Ok()
        {
            string dataPathWithData = $"{Org}/{AppV4}/api/v1/lookup/person";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, dataPathWithData);
            httpRequestMessage.Headers.Referrer = new Uri($"{MockedReferrerUrl}?org={Org}&app={AppV4}&selectedLayoutSet=");

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            Assert.Contains("Test T. Testesen", responseBody);
        }
    }
}
