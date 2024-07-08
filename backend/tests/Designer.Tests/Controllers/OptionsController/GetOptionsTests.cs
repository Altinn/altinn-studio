using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.OptionsController;

public class GetOptionsTests : DisagnerEndpointsTestsBase<GetOptionsTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public GetOptionsTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Fact]
    public async Task GetOptionsListIds_Returns200OK_WithOptionsListIds()
    {
        // Arrange
        string[] expectedOptionsListIds =  ["other-options", "test-options"];

        const string repo = "app-with-options";
        string apiUrl = $"/designer/api/ttd/{repo}/options";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        string[] responseList = JsonSerializer.Deserialize<string[]>(responseBody);

        // Assert
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equal(expectedOptionsListIds, responseList);
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
}
