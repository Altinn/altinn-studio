using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.OptionsController;

public class PutTests : DisagnerEndpointsTestsBase<PutTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public PutTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Theory]
    [InlineData("ttd", "empty-app", "testUser", "new-options")]
    public async Task Create_Returns_200_With_New_OptionsList(string org, string repo, string developer, string optionsListId)
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, repo, developer, targetRepository);

        var newOptionsList = new List<Option>
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

        string apiUrl = $"/designer/api/{org}/{targetRepository}/options/{optionsListId}";
        HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, apiUrl);
        httpRequestMessage.Content = JsonContent.Create(newOptionsList);

        // Act
        HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        var responseList = JsonSerializer.Deserialize<List<Option>>(responseBody);

        // Assert
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equal(newOptionsList.Count, responseList.Count);

        for (int i = 0; i < newOptionsList.Count; i++)
        {
            Assert.Equal(newOptionsList[i].Label, responseList[i].Label);
            Assert.Equal(newOptionsList[i].Value, responseList[i].Value);
            Assert.Equal(newOptionsList[i].Description, responseList[i].Description);
            Assert.Equal(newOptionsList[i].HelpText, responseList[i].HelpText);
        }
    }
}
