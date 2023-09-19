using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ResourceAdminController
{
    public class GetSectorsTests : ResourceAdminControllerTestsBaseClass<GetSectorsTests>
    {

        public GetSectorsTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.ResourceAdminController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task GetSectors()
        {
            //Arrange
            string uri = $"{VersionPrefix}/ttd/resources/sectors";
            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            //Act
            using HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);
            string sectorscontent = await res.Content.ReadAsStringAsync();
            List<DataTheme> dataThemes = System.Text.Json.JsonSerializer.Deserialize<List<DataTheme>>(sectorscontent, new System.Text.Json.JsonSerializerOptions() { PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase });

            //Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.NotEmpty(dataThemes);
        }
    }
}
