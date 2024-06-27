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

    [Theory]
    [InlineData("ttd", "app-with-layoutsets", "test-options")]
    public async Task Get_Returns_OptionsList(string org, string repo, string optionListId)
    {
        // Arrange
        // This expected list matches the list in 'app-with-layoutsets'
        var expectedOptionsList = new List<Option>
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

        string apiUrl = $"/designer/api/{org}/{repo}/options/{optionListId}";
        HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, apiUrl);

        // Act
        HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        var responseList = JsonSerializer.Deserialize<List<Option>>(responseBody);

        // Assert
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equal(expectedOptionsList.Count, responseList.Count);

        for (int i = 0; i < expectedOptionsList.Count; i++)
        {
            Assert.Equal(expectedOptionsList[i].Label, responseList[i].Label);
            Assert.Equal(expectedOptionsList[i].Value, responseList[i].Value);
            Assert.Equal(expectedOptionsList[i].Description, responseList[i].Description);
            Assert.Equal(expectedOptionsList[i].HelpText, responseList[i].HelpText);
        }
    }
}
