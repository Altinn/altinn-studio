﻿using System.Collections.Generic;
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

        private static readonly JsonSerializerOptions _jsonOptions = new()
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
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string file = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, $"App/config/texts/resource.{lang}.json");
            TextResource expectedResource = JsonSerializer.Deserialize<TextResource>(file, _jsonOptions);

            PrepareExpectedResourceWithoutVariables(expectedResource, updateDictionary);

            string url = $"{VersionPrefix(org, targetRepository)}/language/{lang}";

            using var httpContent = new StringContent(JsonSerializer.Serialize(updateDictionary), Encoding.UTF8, MediaTypeNames.Application.Json);

            // Act
            using HttpResponseMessage response = await HttpClient.PutAsync(url, httpContent);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            string actualContent = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, $"App/config/texts/resource.{lang}.json");
            Assert.True(JsonUtils.DeepEquals(JsonSerializer.Serialize(expectedResource, _jsonOptions), actualContent));
        }

        [Theory]
        [MemberData(nameof(DataForTextWithVariables))]
        public async Task UpdateTextsForKeys_ForTextsThatHaveVariables_MaintainsVariablesAndReturnsOk(string org, string app, string developer, string lang, Dictionary<string, string> updateDictionary)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/language/{lang}";

            using var httpContent = new StringContent(JsonSerializer.Serialize(updateDictionary), Encoding.UTF8, MediaTypeNames.Application.Json);

            // Act
            using HttpResponseMessage response = await HttpClient.PutAsync(url, httpContent);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            string actualContent = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, $"App/config/texts/resource.{lang}.json");
            TextResource actualResource = JsonSerializer.Deserialize<TextResource>(actualContent, _jsonOptions);
            Assert.NotNull(actualResource.Resources.Find(el => el.Id == "TextUsingVariables").Variables);
        }

        private static void PrepareExpectedResourceWithoutVariables(TextResource resource, Dictionary<string, string> updateDictionary)
        {
            foreach ((string key, string value) in updateDictionary)
            {
                var textResourceContainsKey = resource.Resources.Find(textResourceElement => textResourceElement.Id == key);
                if (textResourceContainsKey is null)
                {
                    resource.Resources.Insert(0, new TextResourceElement
                    { Id = key, Value = value });
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
    }
}
