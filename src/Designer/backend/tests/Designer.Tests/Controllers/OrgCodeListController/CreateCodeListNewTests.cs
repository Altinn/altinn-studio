using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.OrgCodeListController;

public class CreateCodeListNewTests(WebApplicationFactory<Program> factory)
    : DesignerEndpointsTestsBase<CreateCodeListNewTests>(factory), IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string Repo = "org-content-empty";
    private const string Developer = "testUser";
    private const string CodeListId = "some_code_list_id";

    [Fact]
    public async Task Post_Returns200OK_WhenCreatingNewCodeList()
    {
        // Arrange
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await CopyOrgRepositoryForTest(Developer, Org, Repo, targetOrg, targetRepository);

        string apiUrl = ApiUrl(targetOrg);
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, apiUrl);
        Dictionary<string, string> labelTexts = new() { { "nb", "en tekst" } };
        List<Code> listOfCodes = [new() { Value = "test value", Label = labelTexts }];
        CodeList codeList = new() { Codes = listOfCodes, SourceName = string.Empty, TagNames = [] };
        string codeListString = JsonSerializer.Serialize(codeList, JsonSerializerOptions);

        httpRequestMessage.Content = new StringContent(codeListString, Encoding.UTF8, "application/json");
        List<CodeListData> expectedResponse = new([
            new CodeListData {Title = CodeListId, Data = codeList, HasError = false}
        ]);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseContent = await response.Content.ReadAsStringAsync();
        List<CodeListData> responseList = JsonSerializer.Deserialize<List<CodeListData>>(responseContent, JsonSerializerOptions);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equivalent(expectedResponse, responseList, strict: true);
    }

    private static string ApiUrl(string targetOrg) => $"designer/api/{targetOrg}/code-lists/new/{CodeListId}";
}
