#nullable disable
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.PolicyAdmin.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.PolicyControllerTests
{
    public class GetAppPolicyTests : DesignerEndpointsTestsBase<GetAppPolicyTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly string _versionPrefix = "designer/api";

        public GetAppPolicyTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task GetApp_AppPolicyOk()
        {
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest("ttd", "apps-test", "testUser", targetRepository);
            ResourcePolicy resourcePolicy;

            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/policy";
            using (HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData))
            {
                HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
                response.EnsureSuccessStatusCode();
                string responseBody = await response.Content.ReadAsStringAsync();
                resourcePolicy = System.Text.Json.JsonSerializer.Deserialize<ResourcePolicy>(responseBody, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            }

            Assert.NotNull(resourcePolicy.Rules);
            Assert.Equal(6, resourcePolicy.Rules.Count);
        }
    }
}
