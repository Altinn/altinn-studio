#nullable disable
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.AccessManagement.Tests.Utils;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.OptionsController;

public class GetOptionsTests : DesignerEndpointsTestsBase<GetOptionsTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public GetOptionsTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Fact]
    public async Task GetOptionsListIds_Returns200OK_WithOptionsListIds()
    {
        // Arrange
        const string Repo = "app-with-options";
        string apiUrl = $"/designer/api/ttd/{Repo}/options";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        string[] responseList = JsonSerializer.Deserialize<string[]>(responseBody);

        // Assert
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Contains("test-options", responseList);
        Assert.Contains("other-options", responseList);
    }

    [Fact]
    public async Task GetOptionsListIds_Returns200OK_WithEmptyOptionsListIdArray_WhenAppHasNoOptionsList()
    {
        // Arrange
        const string Repo = "empty-app";
        string apiUrl = $"/designer/api/ttd/{Repo}/options";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        string[] responseList = JsonSerializer.Deserialize<string[]>(responseBody);

        // Assert
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Empty(responseList);
    }

    [Fact]
    public async Task GetOptionLists_Returns200OK_WithOptionListsData()
    {
        // Arrange
        const string Repo = "app-with-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest("ttd", Repo, "testUser", targetRepository);
        string apiUrl = $"/designer/api/ttd/{targetRepository}/options/option-lists";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, apiUrl);
        string optionListMissingValue = @"[{ ""label"": ""someLabel""}]";
        string optionListMissingLabel = @"[{ ""value"": ""someValue""}]";
        string optionListTrailingComma = @"[{ ""value"": ""someValue"", ""label"": ""someLabel"",}]";
        string optionListLabelWithObject = @"[{ ""value"": ""someValue"", ""label"": {}}]";
        string optionListLabelWithNumber = @"[{ ""value"": ""someValue"", ""label"": 12345}]";
        string optionListLabelWithBool = @"[{ ""value"": ""someValue"", ""label"": true}]";
        string repoPath = TestDataHelper.GetTestDataRepositoryDirectory("ttd", targetRepository, "testUser");
        string filePath = Path.Combine(repoPath, "App/options");
        await File.WriteAllTextAsync(Path.Combine(filePath, "optionListMissingValue.json"), optionListMissingValue);
        await File.WriteAllTextAsync(Path.Combine(filePath, "optionListMissingLabel.json"), optionListMissingLabel);
        await File.WriteAllTextAsync(Path.Combine(filePath, "optionListTrailingComma.json"), optionListTrailingComma);
        await File.WriteAllTextAsync(Path.Combine(filePath, "optionListLabelWithObject.json"), optionListLabelWithObject);
        await File.WriteAllTextAsync(Path.Combine(filePath, "optionListLabelWithNumber.json"), optionListLabelWithNumber);
        await File.WriteAllTextAsync(Path.Combine(filePath, "optionListLabelWithBool.json"), optionListLabelWithBool);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        List<OptionListData> responseList = JsonSerializer.Deserialize<List<OptionListData>>(responseBody);

        // Assert
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);

        Assert.Equal(9, responseList.Count);
        Assert.Single(responseList, o => o.Title == "options-with-null-fields" && o.HasError == true);
        Assert.Single(responseList, o => o.Title == "other-options" && o.HasError == false);
        Assert.Single(responseList, o => o.Title == "test-options" && o.HasError == false);
        Assert.Single(responseList, o => o.Title == "optionListMissingValue" && o.HasError == true);
        Assert.Single(responseList, o => o.Title == "optionListMissingLabel" && o.HasError == true);
        Assert.Single(responseList, o => o.Title == "optionListTrailingComma" && o.HasError == true);
        Assert.Single(responseList, o => o.Title == "optionListLabelWithObject" && o.HasError == true);
        Assert.Single(responseList, o => o.Title == "optionListLabelWithNumber" && o.HasError == true);
        Assert.Single(responseList, o => o.Title == "optionListLabelWithBool" && o.HasError == true);

    }

    [Fact]
    public async Task GetSingleOptionsList_Returns200Ok_WithOptionsList()
    {
        // Arrange
        const string Repo = "app-with-options";
        const string OptionsListId = "test-options";

        string apiUrl = $"/designer/api/ttd/{Repo}/options/{OptionsListId}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        var responseList = JsonSerializer.Deserialize<List<Option>>(responseBody);

        // Assert
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equal(2, responseList.Count);

        Assert.Equal("label1", responseList[0].Label);
        Assert.Equal("value1", responseList[0].Value);

        Assert.Equal("label2", responseList[1].Label);
        Assert.Equal("value2", responseList[1].Value);
    }

    [Fact]
    public async Task GetSingleOptionsList_Returns404NotFound_WhenOptionsListDoesNotExist()
    {
        // Arrange
        const string Repo = "empty-app";
        const string OptionsListId = "non-existing-options";

        string apiUrl = $"/designer/api/ttd/{Repo}/options/{OptionsListId}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(StatusCodes.Status404NotFound, (int)response.StatusCode);
    }

    [Fact]
    public async Task GetSingleOptionsList_Returns400BadRequest_WhenOptionsListIsInvalid()
    {
        // Arrange
        const string Repo = "app-with-options";
        const string OptionsListId = "options-with-null-fields";

        string apiUrl = $"/designer/api/ttd/{Repo}/options/{OptionsListId}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);

        var problemDetails = JsonSerializer.Deserialize<ProblemDetails>(await response.Content.ReadAsStringAsync());
        Assert.NotNull(problemDetails);
        JsonElement errorCode = (JsonElement)problemDetails.Extensions[ProblemDetailsExtensionsCodes.ErrorCode];
        Assert.Equal("InvalidOptionsFormat", errorCode.ToString());
    }
}
