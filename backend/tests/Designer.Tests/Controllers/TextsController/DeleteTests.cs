using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.TextsController
{
    public class DeleteTests : DisagnerEndpointsTestsBase<Altinn.Studio.Designer.Controllers.TextsController, DeleteTests>
    {
        protected static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/texts";
        public DeleteTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.TextsController> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "new-texts-format", "testUser", "nb")]
        [InlineData("ttd", "markdown-files", "testUser", "nb")]
        public async Task Delete_200Ok(string org, string app, string developer, string lang)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string dataPathWithData = $"{VersionPrefix(org, targetRepository)}/language/{lang}";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, dataPathWithData);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            string responseBody = await response.Content.ReadAsStringAsync();
            JsonDocument responseDocument = JsonDocument.Parse(responseBody);

            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
            Assert.Equal("Texts file, nb.texts.json, was successfully deleted.", responseDocument.RootElement.ToString());
        }
    }
}
