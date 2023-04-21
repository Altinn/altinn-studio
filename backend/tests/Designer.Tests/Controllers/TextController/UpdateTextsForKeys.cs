using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.TestController
{
    public class UpdateTextsForKeys : TextControllerTestsBase<UpdateTextsForKeys>
    {

        public UpdateTextsForKeys(WebApplicationFactory<TextController> factory) : base(factory)
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
        public async Task UpdateTextsForKeys_WithValidInput_ReturnsOk(string org, string app, string developer, string lang, Dictionary<string,string> updateDictionary)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

            string file = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, $"App/config/texts/resource.{lang}.json");
            var expectedResource = JsonSerializer.Deserialize<Altinn.Studio.Designer.Models.TextResource>(file, _jsonOptions);

            PrepareExpectedResource(expectedResource, updateDictionary);

            string url = $"{VersionPrefix(org, targetRepository)}/language/{lang}";

            var httpContent = new StringContent(JsonSerializer.Serialize(updateDictionary), Encoding.UTF8, MediaTypeNames.Application.Json);

            // Act
            using HttpResponseMessage response = await HttpClient.Value.PutAsync(url, httpContent);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            string actualContent = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, $"App/config/texts/resource.{lang}.json");
            JsonUtils.DeepEquals(JsonSerializer.Serialize(expectedResource, _jsonOptions), actualContent).Should().BeTrue();

        }
        private static void PrepareExpectedResource(TextResource resource, Dictionary<string, string> updateDictionary)
        {
            foreach ((string key, string value) in updateDictionary)
            {
                var textResourceContainsKey = resource.Resources.Find(textResourceElement => textResourceElement.Id == key);
                if (textResourceContainsKey is null)
                {
                    resource.Resources.Add(new TextResourceElement
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
    }
}
