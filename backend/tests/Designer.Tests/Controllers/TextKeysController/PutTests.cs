using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.TextKeysController
{
    public class PutTests : DisagnerEndpointsTestsBase<Altinn.Studio.Designer.Controllers.TextKeysController, GetTests>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/text-keys";
        public PutTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.TextKeysController> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "keys-management", "testUser")]
        public async Task PutNewKey_OldKeyPresentInAllFiles_200OkAndNewKeyPresent(string org, string app, string developer)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string dataPathWithData = $"{VersionPrefix(org, targetRepository)}?oldKey=AlreadyExistingKey&newKey=ReplacedKey";
            HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, dataPathWithData);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            string urlGetKeys = VersionPrefix(org, targetRepository);
            HttpRequestMessage urlGetKeysRequest = new(HttpMethod.Get, urlGetKeys);
            HttpResponseMessage responseGetKeys = await HttpClient.Value.SendAsync(urlGetKeysRequest);
            string list = responseGetKeys.Content.ReadAsStringAsync().Result;
            List<string> keys = JsonSerializer.Deserialize<List<string>>(list);

            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
            Assert.Equal(7, keys.IndexOf("ReplacedKey"));
        }

        [Theory]
        [InlineData("ttd", "keys-management", "testUser")]
        public async Task Put_NewKeyExistInOneFileOldKeyExistInAnotherFile_200OkAndOneLessTotalKeys(string org, string app, string developer)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string dataPathWithData = $"{VersionPrefix(org, targetRepository)}?oldKey=KeyNotDefinedInEnglish&newKey=KeyOnlyDefinedInEnglish";
            HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, dataPathWithData);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            string urlGetKeys = VersionPrefix(org, targetRepository);
            HttpRequestMessage urlGetKeysRequest = new(HttpMethod.Get, urlGetKeys);
            HttpResponseMessage responseGetKeys = await HttpClient.Value.SendAsync(urlGetKeysRequest);
            string list = responseGetKeys.Content.ReadAsStringAsync().Result;
            List<string> keys = JsonSerializer.Deserialize<List<string>>(list);

            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
            Assert.Equal(8, keys.Count);
        }

        [Theory]
        [InlineData("ttd", "keys-management", "testUser")]
        public async Task Put_NewKeyExistInSameFileAsOldKey_400BadRequestNoFilesChanged(string org, string app, string developer)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string dataPathWithData = $"{VersionPrefix(org, targetRepository)}?oldKey=AlreadyExistingKey&newKey=KeyOnlyDefinedInEnglish";
            HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, dataPathWithData);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            string urlGetKeys = VersionPrefix(org, targetRepository);
            HttpRequestMessage urlGetKeysRequest = new(HttpMethod.Get, urlGetKeys);
            HttpResponseMessage responseGetKeys = await HttpClient.Value.SendAsync(urlGetKeysRequest);
            string list = responseGetKeys.Content.ReadAsStringAsync().Result;
            List<string> keys = JsonSerializer.Deserialize<List<string>>(list);

            Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);
            Assert.Contains("AlreadyExistingKey", keys);
        }

        [Theory]
        [InlineData("ttd", "keys-management", "testUser")]
        public async Task Put_EmptyNewKey_200OkOldKeyIsRemoved(string org, string app, string developer)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string dataPathWithData = $"{VersionPrefix(org, targetRepository)}?oldKey=AlreadyExistingKey&newKey=";
            HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, dataPathWithData);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
            string urlGetKeys = VersionPrefix(org, targetRepository);
            HttpRequestMessage urlGetKeysRequest = new(HttpMethod.Get, urlGetKeys);
            HttpResponseMessage responseGetKeys = await HttpClient.Value.SendAsync(urlGetKeysRequest);
            string list = responseGetKeys.Content.ReadAsStringAsync().Result;
            List<string> keys = JsonSerializer.Deserialize<List<string>>(list);

            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
            Assert.Equal(8, keys.Count);
            Assert.DoesNotContain("AlreadyExistingKey", keys);
        }

        [Theory]
        [InlineData("ttd", "empty-app", "testUser")]
        public async Task Put_TextsFilesNotFound_404NotFound(string org, string app, string developer)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string dataPathWithData = $"{VersionPrefix(org, targetRepository)}?oldKey=KeyNotDefinedInEnglish&newKey=KeyOnlyDefinedInEnglish";
            HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, dataPathWithData);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);

            Assert.Equal(StatusCodes.Status404NotFound, (int)response.StatusCode);
        }

        [Theory]
        [InlineData("ttd", "keys-management", "testUser")]
        public async Task Put_IllegalArguments_400BadRequest(string org, string app, string developer)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string dataPathWithData = $"{VersionPrefix(org, targetRepository)}?wrongQueryParam=KeyNotDefinedInEnglish&newKey=KeyOnlyDefinedInEnglish";
            HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, dataPathWithData);

            HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);

            Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);
        }
    }
}
