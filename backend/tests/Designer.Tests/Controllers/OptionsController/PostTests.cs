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

    [Theory]
    [InlineData("ttd", "empty-app", "testUser", "new-option-list")]
    public async Task Post_Returns_201Created_When_OptionList_Is_Created(string org, string repo, string developer, string optionListId)
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

        string apiUrl = $"/designer/api/{org}/{targetRepository}/options/{optionListId}";
        HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, apiUrl);
        httpRequestMessage.Content = JsonContent.Create(newOptionsList);

        // Act
        HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
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

    [Theory]
    [InlineData("ttd", "app-with-options", "testUser", "test-options")]
    public async Task Post_Returns_409Conflict_When_OptionList_Already_Exists(string org, string repo, string developer, string optionListId)
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

        string apiUrl = $"/designer/api/{org}/{targetRepository}/options/{optionListId}";
        HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, apiUrl);
        httpRequestMessage.Content = JsonContent.Create(newOptionsList);

        // Act
        HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(StatusCodes.Status409Conflict, (int)response.StatusCode);
    }

    [Theory]
    [InlineData("ttd", "empty-app", "testUser", "null-option-list")]
    public async Task Post_Returns_400BadRequest_When_OptionList_Is_Null(string org, string repo, string developer, string optionListId)
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, repo, developer, targetRepository);

        string apiUrl = $"/designer/api/{org}/{targetRepository}/options/{optionListId}";
        HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, apiUrl);
        httpRequestMessage.Content = JsonContent.Create<List<Option>>(null);

        // Act
        HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);
    }

    [Theory]
    [InlineData("ttd", "empty-app", "testUser", "invalid-option-list")]
    public async Task Post_Returns_400BadRequest_When_OptionList_Format_Is_Invalid(string org, string repo, string developer, string optionListId)
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, repo, developer, targetRepository);

        var invalidOptionsList = new List<Option>
        {
            new Option
            {
                // Label field is missing
                Value = "value1",
            },
            new Option
            {
                Label = "label2",
                Value = "value2",
            }
        };

        string apiUrl = $"/designer/api/{org}/{targetRepository}/options/{optionListId}";
        HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, apiUrl);
        httpRequestMessage.Content = JsonContent.Create(invalidOptionsList);

        // Act
        HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);
    }
}
