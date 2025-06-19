using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.TextController
{
    public class UpdateTextsForKeysTests : DesignerEndpointsTestsBase<UpdateTextsForKeysTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/text";
        public UpdateTextsForKeysTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        private static readonly JsonSerializerOptions s_jsonOptions = new()
        {
            WriteIndented = true,
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        [Theory]
        [MemberData(nameof(Data))]
        public async Task UpdateTextsForKeys_WithValidInput_ReturnsOk(string org, string app, string developer, string lang, Dictionary<string, string> updateDictionary)
        {
            string targetRepository = await GenerateTestRepository(org, app, developer);

            TextResource expectedResource = GetTextResource(org, app, developer, lang);
            PrepareExpectedResourceWithoutVariables(expectedResource, updateDictionary);

            // Act
            using HttpResponseMessage response = await RunPutRequest(org, targetRepository, lang, updateDictionary);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            string actualContent = GetTextResourceFileContent(org, targetRepository, developer, lang);
            Assert.True(JsonUtils.DeepEquals(JsonSerializer.Serialize(expectedResource, s_jsonOptions), actualContent));
        }

        [Theory]
        [MemberData(nameof(Data))]
        public async Task UpdateTextsForKeys_WithValidInput_ReturnsUpdatedData(string orgName, string appName, string username, string language, Dictionary<string, string> updateDictionary)
        {
            string targetRepository = await GenerateTestRepository(orgName, appName, username);

            TextResource expectedResource = GetTextResource(orgName, appName, username, language);
            PrepareExpectedResourceWithoutVariables(expectedResource, updateDictionary);

            // Act
            using HttpResponseMessage response = await RunPutRequest(orgName, targetRepository, language, updateDictionary);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            string responseContent = await response.Content.ReadAsStringAsync();
            Assert.True(JsonUtils.DeepEquals(JsonSerializer.Serialize(expectedResource, s_jsonOptions), responseContent));
        }

        [Theory]
        [MemberData(nameof(DataForTextWithVariables))]
        public async Task UpdateTextsForKeys_ForTextsThatHaveVariables_MaintainsVariablesAndReturnsOk(string org, string app, string developer, string lang, Dictionary<string, string> updateDictionary)
        {
            string targetRepository = await GenerateTestRepository(org, app, developer);

            // Act
            using HttpResponseMessage response = await RunPutRequest(org, targetRepository, lang, updateDictionary);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            TextResource actualResource = GetTextResource(org, targetRepository, developer, lang);
            Assert.NotNull(actualResource.Resources.Find(el => el.Id == "TextUsingVariables").Variables);
        }

        private static void PrepareExpectedResourceWithoutVariables(TextResource resource, Dictionary<string, string> updateDictionary)
        {
            foreach ((string key, string value) in updateDictionary)
            {
                var textResourceContainsKey = resource.Resources.Find(textResourceElement => textResourceElement.Id == key);
                if (textResourceContainsKey is null)
                {
                    resource.Resources.Insert(0, new TextResourceElement { Id = key, Value = value });
                    continue;
                }

                int indexTextResourceElementUpdateKey = resource.Resources.IndexOf(textResourceContainsKey);
                resource.Resources[indexTextResourceElementUpdateKey] = new TextResourceElement { Id = key, Value = value };
            }
        }

        public static IEnumerable<object[]> Data =>
            new List<object[]>
            {
                new object[] { "ttd", "hvem-er-hvem", "testUser", "nb", new Dictionary<string,string>()
                {
                    {"Epost", "new"},
                    {"nonExistingKey", "new value"}
                }}
            };

        public static IEnumerable<object[]> DataForTextWithVariables =>
            new List<object[]>
            {
                new object[] { "ttd", "hvem-er-hvem", "testUser", "nb", new Dictionary<string,string>()
                {
                    {"TextUsingVariables", "Dette er den nye teksten og variablene {0} og {1} har ikke blitt borte eller endret"},
                }}
            };

        private async Task<string> GenerateTestRepository(string orgName, string appName, string username)
        {
            string repoName = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(orgName, appName, username, repoName);
            return repoName;
        }

        private static TextResource GetTextResource(string orgName, string appName, string username, string language)
        {
            string fileContent = GetTextResourceFileContent(orgName, appName, username, language);
            return JsonSerializer.Deserialize<TextResource>(fileContent, s_jsonOptions);
        }

        private static string GetTextResourceFileContent(string orgName, string repositoryName, string username, string language)
        {
            string path = GetTextResourceFilePath(language);
            return TestDataHelper.GetFileFromRepo(orgName, repositoryName, username, path);
        }

        private static string GetTextResourceFilePath(string language) =>
            $"App/config/texts/resource.{language}.json";

        private async Task<HttpResponseMessage> RunPutRequest(string orgName, string repositoryName, string language, Dictionary<string, string> updateDictionary)
        {
            string url = CreateUrl(orgName, repositoryName, language);
            using var httpContent = CreateStringContent(updateDictionary);
            return await HttpClient.PutAsync(url, httpContent);
        }

        private static string CreateUrl(string orgName, string repositoryName, string language) =>
            $"{VersionPrefix(orgName, repositoryName)}/language/{language}";

        private static StringContent CreateStringContent(Dictionary<string, string> updateDictionary) =>
            new(JsonSerializer.Serialize(updateDictionary), Encoding.UTF8, MediaTypeNames.Application.Json);
    }
}
