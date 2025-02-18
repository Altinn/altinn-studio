using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.OrgCodeListController;

public class GetCodeListsTests: DesignerEndpointsTestsBase<GetCodeListsTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public GetCodeListsTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    private const string Org = "ttd";
    private const string Developer = "testUser";
    private const string ApiUrl = $"designer/api/{Org}/code-lists";
    private const string TargetRepository = "ttd-content";

    [Fact]
    public async Task GetCodeLists_Returns200Ok_With_CodeLists()
    {
        // Arrange
        const string repo = "org-content";
        await CopyRepositoryForTest(Org, repo, Developer, TargetRepository);
        using HttpRequestMessage httpRequestMessage = new (HttpMethod.Get, ApiUrl);

        // Arc
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        List<OptionListData> responseList = JsonSerializer.Deserialize<List<OptionListData>>(responseBody);

        // Assert
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equal(8, responseList.Count);
        Assert.Single(responseList, e => e.Title == "codeListNumber" && e.HasError == false);
        Assert.Single(responseList, e => e.Title == "codeListString" && e.HasError == false);
        Assert.Single(responseList, e => e.Title == "codeListMissingValue" && e.HasError == true);
        Assert.Single(responseList, e => e.Title == "codeListMissingLabel" && e.HasError == true);
        Assert.Single(responseList, e => e.Title == "codeListTrailingComma" && e.HasError == true);
        Assert.Single(responseList, e => e.Title == "codeListLabelWithBool" && e.HasError == true);
        Assert.Single(responseList, e => e.Title == "codeListLabelWithNumber" && e.HasError == true);
        Assert.Single(responseList, e => e.Title == "codeListLabelWithObject" && e.HasError == true);
    }

    [Fact]
    public async Task GetCodeLists_Returns200Ok_With_No_CodeLists()
    {
        // Arrange
        const string repo = "org-content-empty";
        await CopyRepositoryForTest(Org, repo, Developer, TargetRepository);
        using HttpRequestMessage httpRequestMessage = new (HttpMethod.Get, ApiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        List<OptionListData> responseList = JsonSerializer.Deserialize<List<OptionListData>>(responseBody);

        // Assert
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Empty(responseList);
        Assert.IsType<List<OptionListData>>(responseList);
    }
}
