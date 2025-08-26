using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ResourceAdminController
{
    public class GetGetLosTermsTests : ResourceAdminControllerTestsBaseClass<GetGetLosTermsTests>, IClassFixture<WebApplicationFactory<Program>>
    {

        public GetGetLosTermsTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task GetLosTerms()
        {
            //Arrange
            string uri = $"{VersionPrefix}/ttd/resources/losterms";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            //Act
            using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);
            string sectorscontent = await res.Content.ReadAsStringAsync();
            List<LosTerm> losTerms = System.Text.Json.JsonSerializer.Deserialize<List<LosTerm>>(sectorscontent, new System.Text.Json.JsonSerializerOptions() { PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase });

            //Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.NotEmpty(losTerms);
        }
    }
}
