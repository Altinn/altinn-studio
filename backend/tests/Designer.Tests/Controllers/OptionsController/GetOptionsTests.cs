using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Designer.Tests.Controllers.ApiTests;
using FluentAssertions;
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
        const string repo = "app-with-options";
        string apiUrl = $"/designer/api/ttd/{repo}/options";
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
        const string repo = "empty-app";
        string apiUrl = $"/designer/api/ttd/{repo}/options";
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
        const string repo = "app-with-options";
        string apiUrl = $"/designer/api/ttd/{repo}/options/option-lists";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        List<OptionListData> responseList = JsonSerializer.Deserialize<List<OptionListData>>(responseBody);

        // Assert
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        responseList.Should().BeEquivalentTo(new List<OptionListData>
        {
            new () { Title = "options-with-null-fields", Data = null, HasError = true },
            new () { Title = "other-options", HasError = false },
            new () { Title = "test-options", HasError = false }
        }, options => options.Excluding(x => x.Data));
    }

    [Fact]
    public async Task GetSingleOptionsList_Returns200Ok_WithOptionsList()
    {
        // Arrange
        const string repo = "app-with-options";
        const string optionsListId = "test-options";

        string apiUrl = $"/designer/api/ttd/{repo}/options/{optionsListId}";
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
        const string repo = "empty-app";
        const string optionsListId = "non-existing-options";

        string apiUrl = $"/designer/api/ttd/{repo}/options/{optionsListId}";
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
        const string repo = "app-with-options";
        const string optionsListId = "options-with-null-fields";

        string apiUrl = $"/designer/api/ttd/{repo}/options/{optionsListId}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);

        var problemDetails = JsonSerializer.Deserialize<ProblemDetails>(await response.Content.ReadAsStringAsync());
        problemDetails.Should().NotBeNull();
        JsonElement errorCode = (JsonElement)problemDetails.Extensions[ProblemDetailsExtensionsCodes.ErrorCode];
        errorCode.ToString().Should().Be("InvalidOptionsFormat");
    }
}
