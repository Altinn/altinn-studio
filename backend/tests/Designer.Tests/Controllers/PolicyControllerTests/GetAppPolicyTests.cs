using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.PolicyAdmin.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.PolicyControllerTests
{
    public class GetAppPolicyTests : DisagnerEndpointsTestsBase<PolicyController, GetAppPolicyTests>
    {
        private readonly string _versionPrefix = "designer/api";

        public GetAppPolicyTests(WebApplicationFactory<PolicyController> factory) : base(factory)
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
                HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
                response.EnsureSuccessStatusCode();
                string responseBody = await response.Content.ReadAsStringAsync();
                resourcePolicy = System.Text.Json.JsonSerializer.Deserialize<ResourcePolicy>(responseBody, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            }

            Assert.NotNull(resourcePolicy.Rules);
            Assert.Equal(6, resourcePolicy.Rules.Count);
        }
    }
}
