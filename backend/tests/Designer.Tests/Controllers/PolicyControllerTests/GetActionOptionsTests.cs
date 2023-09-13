using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Controllers;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using PolicyAdmin.Models;
using Xunit;

namespace Designer.Tests.Controllers.PolicyControllerTests
{
    public class GetActionOptionsTests : DisagnerEndpointsTestsBase<PolicyController, GetActionOptionsTests>
    {
        private readonly string _versionPrefix = "designer/api";

        public GetActionOptionsTests(WebApplicationFactory<PolicyController> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_ActionOptions()
        {
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest("ttd", "ttd-resources", "testUser", targetRepository);

            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/policy/actionoptions";
            List<ActionOption> actionOptions;

            using (HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData))
            {
                HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
                response.EnsureSuccessStatusCode();
                string responseBody = await response.Content.ReadAsStringAsync();
                actionOptions = System.Text.Json.JsonSerializer.Deserialize<List<ActionOption>>(responseBody, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            }

            Assert.NotNull(actionOptions);
        }
    }
}
