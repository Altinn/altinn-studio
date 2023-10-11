using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class LayoutSetsTests: PreviewControllerTestsBase<LayoutSetsTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        public LayoutSetsTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_LayoutSets_NotFound()
        {
            string dataPathWithData = $"{Org}/{App}/api/layoutsets";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }
}
