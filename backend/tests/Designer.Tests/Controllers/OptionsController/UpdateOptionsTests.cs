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

public class UpdateOptionsTests : DesignerEndpointsTestsBase<UpdateOptionsTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public UpdateOptionsTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    private const string Org = "ttd";
    private const string Developer = "testUser";

    [Fact]
    public async Task Put_Returns_200OK_When_Creating_New_OptionsList()
    {
        // Arrange
        const string repo = "empty-app";
        const string optionsListId = "new-options";

        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, repo, Developer, targetRepository);

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

        string apiUrl = $"/designer/api/{Org}/{targetRepository}/options/{optionsListId}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, apiUrl);
        httpRequestMessage.Content = JsonContent.Create(newOptionsList);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
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

    [Fact]
    public async Task Put_Returns_200OK_And_Overwrites_Existing_OptionsList()
    {
        // Arrange
        const string repo = "app-with-options";
        const string optionsListId = "test-options";

        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, repo, Developer, targetRepository);

        var newOptionsList = new List<Option>
        {
            new Option
            {
                Label = "aNewLabelThatDidNotExistBefore",
                Value = "aNewValueThatDidNotExistBefore",
            },
            new Option
            {
                Label = "label2",
                Value = "value2",
            }
        };

        string apiUrl = $"/designer/api/{Org}/{targetRepository}/options/{optionsListId}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, apiUrl);
        httpRequestMessage.Content = JsonContent.Create(newOptionsList);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
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

    [Theory]
    [InlineData("options-missing-label")]
    [InlineData("options-empty-json")]
    public async Task Put_Returns_400BadRequest_When_OptionsList_Format_Is_Invalid(string optionsListId)
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, "empty-app", Developer, targetRepository);

        string apiUrl = $"/designer/api/{Org}/{targetRepository}/options/{optionsListId}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, apiUrl);

        if (optionsListId == "options-missing-label")
        {
            var invalidOptionsList = new List<Option>
            {
                new Option
                {
                    // Missing Label
                    Value = "value1",
                },
                new Option
                {
                    Label = "label2",
                    Value = "value2",
                }
            };
            httpRequestMessage.Content = JsonContent.Create(invalidOptionsList);
        }
        else if (optionsListId == "options-empty-json")
        {
            httpRequestMessage.Content = JsonContent.Create<List<Option>>(null);
        }

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);
    }
}
