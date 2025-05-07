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

namespace Designer.Tests.Controllers.OrgTextController;

public class UpdateResourceTests : DesignerEndpointsTestsBase<UpdateResourceTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public UpdateResourceTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Theory]
    [MemberData(nameof(Data))]
    public async Task UpdateResource_Returns200OK_WithValidInput(string org, string developer, string repo, string lang, Dictionary<string, string> updateDictionary)
    {
        // Arrange
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await CopyOrgRepositoryForTest(developer, org, repo, targetOrg, targetRepository);

        string file = TestDataHelper.GetFileFromRepo(targetOrg, targetRepository, developer, RelativePath(lang));
        TextResource expectedResource = JsonSerializer.Deserialize<TextResource>(file, s_jsonOptions);
        PrepareExpectedResourceWithoutVariables(expectedResource, updateDictionary);

        string apiUrl = ApiUrl(targetOrg, lang);
        using HttpRequestMessage requestMessage = new(HttpMethod.Patch, apiUrl);
        requestMessage.Content = new StringContent(JsonSerializer.Serialize(updateDictionary), Encoding.UTF8, MediaTypeNames.Application.Json);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(requestMessage);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        string actualContent = TestDataHelper.GetFileFromRepo(targetOrg, targetRepository, developer, RelativePath(lang));
        Assert.True(JsonUtils.DeepEquals(JsonSerializer.Serialize(expectedResource, s_jsonOptions), actualContent));
    }

    [Theory]
    [MemberData(nameof(DataForTextWithVariables))]
    public async Task UpdateResource_Returns200OK_ForTextsThatHaveVariables(string org, string developer, string repo, string lang, Dictionary<string, string> updateDictionary)
    {
        // Arrange
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await CopyOrgRepositoryForTest(developer, org, repo, targetOrg, targetRepository);

        string originalFile = TestDataHelper.GetFileFromRepo(targetOrg, targetRepository, developer, RelativePath(lang));
        TextResource originalResource = JsonSerializer.Deserialize<TextResource>(originalFile, s_jsonOptions);
        List<TextResourceVariable> expectedVariables = originalResource.Resources.Find(e => e.Id == "TextUsingVariables").Variables;

        string apiUrl = ApiUrl(targetOrg, lang);
        using HttpRequestMessage requestMessage = new(HttpMethod.Patch, apiUrl);
        requestMessage.Content = new StringContent(JsonSerializer.Serialize(updateDictionary), Encoding.UTF8, MediaTypeNames.Application.Json);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(requestMessage);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        string actualContent = TestDataHelper.GetFileFromRepo(targetOrg, targetRepository, developer, RelativePath(lang));
        TextResource actualResource = JsonSerializer.Deserialize<TextResource>(actualContent, s_jsonOptions);
        List<TextResourceVariable> actualVariables = actualResource.Resources.Find(e => e.Id == "TextUsingVariables").Variables;
        Assert.NotNull(actualVariables);
        Assert.Equal(expectedVariables.Count, actualVariables.Count);
    }

    private static string ApiUrl(string org, string languageCode) => $"/designer/api/{org}/text/language/{languageCode}";

    private static string RelativePath(string language) => $"Texts/resource.{language}.json";

    private static readonly JsonSerializerOptions s_jsonOptions = new()
    {
        WriteIndented = true,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

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
            new object[] { "ttd", "testUser", "org-content", "nb", new Dictionary<string,string>
            {
                {"Email", "new"},
                {"nonExistingKey", "new value"}
            }}
        };

    public static IEnumerable<object[]> DataForTextWithVariables =>
        new List<object[]>
        {
            new object[] { "ttd", "testUser", "org-content", "nb", new Dictionary<string,string>()
            {
                {"TextUsingVariables", "Dette er den nye teksten og variablene {0} og {1} har ikke blitt borte eller endret"},
            }}
        };
}
