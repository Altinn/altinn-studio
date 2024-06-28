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

public class GetTests : DisagnerEndpointsTestsBase<GetTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public GetTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Fact]
    public async Task GetOptionListIds_Returns_200OK_With_OptionListIds()
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
        Assert.Equal(2, responseList.Length);
    }

    [Fact]
    public async Task GetOptionListIds_Returns_200OK_With_Empty_OptionListId_Array()
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
    public async Task GetSingleOptionList_Returns_200Ok_With_OptionList()
    {
        // Arrange
        const string repo = "app-with-options";
        const string optionListId = "test-options";

        // This  option list matches the list in 'app-with-options'
        var expectedOptionList = new List<Option>
        {
            new Option
            {
                Label = "label1",
                Value = "value1",
            },
            new Option
            {
                Label = "label2",
                Value = "value2",
            }
        };

        string apiUrl = $"/designer/api/ttd/{repo}/options/{optionListId}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        var responseList = JsonSerializer.Deserialize<List<Option>>(responseBody);

        // Assert
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equal(expectedOptionList.Count, responseList.Count);

        for (int i = 0; i < expectedOptionList.Count; i++)
        {
            Assert.Equal(expectedOptionList[i].Label, responseList[i].Label);
            Assert.Equal(expectedOptionList[i].Value, responseList[i].Value);
            Assert.Equal(expectedOptionList[i].Description, responseList[i].Description);
            Assert.Equal(expectedOptionList[i].HelpText, responseList[i].HelpText);
        }
    }

    [Fact]
    public async Task GetSingleOptionList_Returns_404NotFound_When_OptionList_Does_Not_Exist()
    {
        // Arrange
        const string repo = "empty-app";
        const string optionListId = "non-existing-options";

        string apiUrl = $"/designer/api/ttd/{repo}/options/{optionListId}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(StatusCodes.Status404NotFound, (int)response.StatusCode);
    }
}
