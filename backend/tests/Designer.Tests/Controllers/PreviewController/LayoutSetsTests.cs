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
    public class LayoutSetsTests : PreviewControllerTestsBase<LayoutSetsTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        public LayoutSetsTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_LayoutSets_ShouldReturnLayoutSetsWithoutAnyUndefinedDataTypes()
        {
            string actualLayoutSetsString = TestDataHelper.GetFileFromRepo(Org, AppV4, Developer, "App/ui/layout-sets.json");
            LayoutSets actualLayoutSets = JsonSerializer.Deserialize<LayoutSets>(actualLayoutSetsString);

            string dataPathWithData = $"{Org}/{AppV4}/api/layoutsets";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseBody = await response.Content.ReadAsStringAsync();
            LayoutSets responseLayoutSets = JsonSerializer.Deserialize<LayoutSets>(responseBody);

            actualLayoutSets.Sets.Exists(set => set.DataType is null).Should().BeTrue();
            responseLayoutSets.Sets.Exists(set => set.DataType is null).Should().BeFalse();
        }

        [Fact]
        public async Task Get_LayoutSets_NotFound()
        {
            string dataPathWithData = $"{Org}/{AppV3}/api/layoutsets";
            using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, dataPathWithData);

            using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }
}
