using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.TextKeysController
{
    public class GetTests : TextKeysControllerTestsBase<GetTests>
    {
        public GetTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.TextKeysController> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "keys-management", "testUser", 9)]
        public async Task Get_Keys_200Ok(string org, string app, string developer, int expectedKeyNumber)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);
            string dataPathWithData = VersionPrefix(org, targetRepository);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

            string content = await response.Content.ReadAsStringAsync();
            List<string> keys = JsonSerializer.Deserialize<List<string>>(content);

            Assert.Equal(expectedKeyNumber, keys.Count);
        }

        [Theory]
        [InlineData("ttd", "empty-app", "testUser")]
        public async Task GetKeys_TextsFilesNotFound_404NotFound(string org, string app, string developer)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);
            string dataPathWithData = VersionPrefix(org, targetRepository);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(StatusCodes.Status404NotFound, (int)response.StatusCode);
        }

        [Theory]
        [InlineData("ttd", "invalid-texts-and-ruleconfig", "testUser")]
        public async Task GetKeys_TextsFileInvalidFormat_500InternalServerError(string org, string app, string developer)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);
            string dataPathWithData = VersionPrefix(org, targetRepository);
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);

            Assert.Equal(StatusCodes.Status500InternalServerError, (int)response.StatusCode);
        }

    }
}
