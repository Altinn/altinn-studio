using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using PolicyAdmin.Models;
using Xunit;

namespace Designer.Tests.Controllers.PolicyControllerTests
{
    public class GetSubjectOptionsTests : DesignerEndpointsTestsBase<GetSubjectOptionsTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly string _versionPrefix = "designer/api";

        public GetSubjectOptionsTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_SubjectOptions()
        {
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest("ttd", "ttd-resources", "testUser", targetRepository);

            string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/policy/subjectoptions";
            List<SubjectOption> subjectionOptions;
            using (HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData))
            {
                HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
                response.EnsureSuccessStatusCode();
                string responseBody = await response.Content.ReadAsStringAsync();

                subjectionOptions = System.Text.Json.JsonSerializer.Deserialize<List<SubjectOption>>(responseBody, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            }

            Assert.NotNull(subjectionOptions);
        }
    }
}
