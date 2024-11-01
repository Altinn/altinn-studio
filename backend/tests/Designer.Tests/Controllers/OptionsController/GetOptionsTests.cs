using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Http;
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
        var responseList = JsonSerializer.Deserialize<List<Option<IOptionValue>>>(responseBody);

        // Assert
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equal(2, responseList.Count);

        var stringOptionValue1 = responseList[0]?.Value as StringOptionValue;
        Assert.NotNull(stringOptionValue1);
        Assert.Equal("value1", stringOptionValue1.Value);

        var stringOptionValue2 = responseList[1]?.Value as StringOptionValue;
        Assert.NotNull(stringOptionValue2);
        Assert.Equal("value2", stringOptionValue2.Value);
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
