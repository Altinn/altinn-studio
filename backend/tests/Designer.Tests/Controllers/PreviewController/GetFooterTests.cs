using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.PreviewController
{
    public class GetFooterTests : PreviewControllerTestsBase<GetFooterTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        public GetFooterTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_Footer_Exists_Ok()
        {
            string expectedFooter = TestDataHelper.GetFileFromRepo(Org, AppV4, Developer, "App/ui/footer.json");
            FooterFile actualFooterFile = JsonSerializer.Deserialize<FooterFile>(expectedFooter);

            string dataPathWithData = $"{Org}/{AppV4}/api/v1/footer";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseString = await response.Content.ReadAsStringAsync();
            FooterFile responseFooterFile = JsonSerializer.Deserialize<FooterFile>(responseString);

            responseFooterFile.Footer.Should().BeEquivalentTo(actualFooterFile.Footer);
        }
    }
}
