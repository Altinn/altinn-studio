using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.PolicyAdmin.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Newtonsoft.Json;
using Xunit;

namespace Designer.Tests.Controllers.PolicyControllerTests
{
    public class UpdateApplicationPolicyTests : DesignerEndpointsTestsBase<UpdateApplicationPolicyTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly string _versionPrefix = "designer/api";

        public UpdateApplicationPolicyTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Update_AppPolicyOk()
        {
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest("ttd", "apps-test", "testUser", targetRepository);

            ResourcePolicy resourcePolicy = TestPolicyHelper.GenerateTestPolicy("ttd", targetRepository);

            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/policy";
            string responseBody;
            using (HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, dataPathWithData))
            {
                httpRequestMessage.Content = new StringContent(JsonConvert.SerializeObject(resourcePolicy), Encoding.UTF8, "application/json");

                HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
                response.EnsureSuccessStatusCode();
                responseBody = await response.Content.ReadAsStringAsync();
            }

            Assert.NotEmpty(responseBody);
        }

        [Fact]
        public async Task Create_ResourcePolicyOk()
        {
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest("ttd", "ttd-resources", "testUser", targetRepository);

            ResourcePolicy resourcePolicy = TestPolicyHelper.GenerateTestPolicy("ttd", targetRepository, "ttdres2");
            string responseBody;
            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/policy/ttdres2";

            using (HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, dataPathWithData))
            {
                httpRequestMessage.Content = new StringContent(JsonConvert.SerializeObject(resourcePolicy), Encoding.UTF8, "application/json");
                HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
                response.EnsureSuccessStatusCode();
                responseBody = await response.Content.ReadAsStringAsync();
            }

            Assert.NotEmpty(responseBody);
        }
    }
}
