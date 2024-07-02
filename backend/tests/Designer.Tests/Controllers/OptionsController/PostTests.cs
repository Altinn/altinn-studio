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

public class PostTests : DisagnerEndpointsTestsBase<PostTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public PostTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    private const string Org = "ttd";
    private const string Developer = "testUser";

    [Fact]
    public async Task Post_Returns_201Created_When_OptionList_Is_Created()
    {
        // Arrange
        const string repo = "empty-app";
        const string optionListId = "new-option-list";

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

        string apiUrl = $"/designer/api/{Org}/{targetRepository}/options/{optionListId}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, apiUrl);
        httpRequestMessage.Content = JsonContent.Create(newOptionsList);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        var responseList = JsonSerializer.Deserialize<List<Option>>(responseBody);

        // Assert
        Assert.Equal(StatusCodes.Status201Created, (int)response.StatusCode);
        Assert.Equal(newOptionsList.Count, responseList.Count);

        for (int i = 0; i < newOptionsList.Count; i++)
        {
            Assert.Equal(newOptionsList[i].Label, responseList[i].Label);
            Assert.Equal(newOptionsList[i].Value, responseList[i].Value);
        }
    }

    [Fact]
    public async Task Post_Returns_409Conflict_When_OptionList_Already_Exists()
    {
        // Arrange
        const string repo = "app-with-options";
        const string optionListId = "test-options";

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

        string apiUrl = $"/designer/api/{Org}/{targetRepository}/options/{optionListId}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, apiUrl);
        httpRequestMessage.Content = JsonContent.Create(newOptionsList);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(StatusCodes.Status409Conflict, (int)response.StatusCode);
    }

    [Theory]
    [InlineData("ttd", "empty-app", "testUser", "options-missing-label")]
    [InlineData("ttd", "empty-app", "testUser", "options-empty-json")]
    public async Task Post_Returns_400BadRequest_When_OptionList_Format_Is_Invalid(string org, string repo, string developer, string optionListId)
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, repo, developer, targetRepository);

        string apiUrl = $"/designer/api/{org}/{targetRepository}/options/{optionListId}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, apiUrl);

        if (optionListId == "options-missing-label")
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
        else if (optionListId == "options-empty-json")
        {
            httpRequestMessage.Content = JsonContent.Create<List<Option>>(null);
        }

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);
    }
}
