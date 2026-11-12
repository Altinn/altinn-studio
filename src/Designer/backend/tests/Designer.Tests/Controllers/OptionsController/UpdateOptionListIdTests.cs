using System.IO;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Filters;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.OptionsController;

public class UpdateOptionListIdTests(WebApplicationFactory<Program> factory)
    : DesignerEndpointsTestsBase<UpdateOptionListIdTests>(factory),
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string Developer = "testUser";

    [Theory]
    [InlineData("app-with-layoutsets", "test-options")]
    [InlineData("app-with-options-v9", "unused-options")]
    public async Task Put_Returns_200OK_With_Same_File_Content_When_Updating_Id(string repo, string optionsListId)
    {
        // Arrange
        const string NewOptionListId = "new-option-list-id";

        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, repo, Developer, targetRepository);
        var originalOptionList = TestDataHelper.GetFileFromRepo(
            Org,
            repo,
            Developer,
            $"App/options/{optionsListId}.json"
        );

        string apiUrl = $"/designer/api/{Org}/{targetRepository}/options/change-name/{optionsListId}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, apiUrl);
        httpRequestMessage.Content = new StringContent(
            $"\"{NewOptionListId}\"",
            Encoding.UTF8,
            MediaTypeNames.Application.Json
        );

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        var optionListWithNewId = TestDataHelper.GetFileFromRepo(
            Org,
            targetRepository,
            Developer,
            $"App/options/{NewOptionListId}.json"
        );
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equal(originalOptionList, optionListWithNewId);
    }

    [Fact]
    public async Task Put_Returns_400BadRequest_When_Updating_Id_To_Existing_Option_File_Name()
    {
        // Arrange
        const string Repo = "app-with-options-v9";
        const string OptionsListId = "unused-options";
        const string NewOptionListId = "fruits";

        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, Repo, Developer, targetRepository);
        var originalOptionList = TestDataHelper.GetFileFromRepo(
            Org,
            Repo,
            Developer,
            $"App/options/{OptionsListId}.json"
        );

        string apiUrl = $"/designer/api/{Org}/{targetRepository}/options/change-name/{OptionsListId}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, apiUrl);
        httpRequestMessage.Content = new StringContent(
            $"\"{NewOptionListId}\"",
            Encoding.UTF8,
            MediaTypeNames.Application.Json
        );

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        var responseContent = await response.Content.ReadAsStringAsync();
        string responseString = JsonSerializer.Deserialize<string>(responseContent);

        // Assert
        var optionListWithSameId = TestDataHelper.GetFileFromRepo(
            Org,
            targetRepository,
            Developer,
            $"App/options/{OptionsListId}.json"
        );
        Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);
        Assert.Equal($"Suggested file name {NewOptionListId}.json already exists.", responseString);
        Assert.Equal(originalOptionList, optionListWithSameId);
    }

    [Theory]
    [InlineData("app-with-options", "test-options")]
    [InlineData("app-with-options-v9", "fruits")]
    public async Task Put_Returns_409Conflict_When_Option_List_Is_In_Use(string repo, string optionsListId)
    {
        // Arrange
        const string NewOptionListId = "new-option-list-id";

        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, repo, Developer, targetRepository);
        string repositoryPath = TestDataHelper.GetTestDataRepositoryDirectory(Org, targetRepository, Developer);

        string apiUrl = $"/designer/api/{Org}/{targetRepository}/options/change-name/{optionsListId}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, apiUrl);
        httpRequestMessage.Content = new StringContent(
            $"\"{NewOptionListId}\"",
            Encoding.UTF8,
            MediaTypeNames.Application.Json
        );

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        ProblemDetails problemDetails = JsonSerializer.Deserialize<ProblemDetails>(
            await response.Content.ReadAsStringAsync()
        );

        // Assert
        Assert.Equal(StatusCodes.Status409Conflict, (int)response.StatusCode);
        Assert.NotNull(problemDetails);
        JsonElement errorCode = (JsonElement)problemDetails.Extensions[ProblemDetailsExtensionsCodes.ErrorCode];
        Assert.Equal("OptionListInUse", errorCode.ToString());
        Assert.True(File.Exists(Path.Combine(repositoryPath, "App", "options", $"{optionsListId}.json")));
        Assert.False(File.Exists(Path.Combine(repositoryPath, "App", "options", $"{NewOptionListId}.json")));
    }

    [Fact]
    public async Task Put_Returns_400BadRequest_When_Updating_Id_Of_NonExistent_Option_File()
    {
        // Arrange
        const string Repo = "app-with-options";
        const string OptionsListId = "options-that-does-not-exist";
        const string NewOptionListId = "new-option-list-id";

        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, Repo, Developer, targetRepository);
        string relativePath = $"App/options/{OptionsListId}.json";

        string apiUrl = $"/designer/api/{Org}/{targetRepository}/options/change-name/{OptionsListId}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, apiUrl);
        httpRequestMessage.Content = new StringContent(
            $"\"{NewOptionListId}\"",
            Encoding.UTF8,
            MediaTypeNames.Application.Json
        );

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        var responseContent = await response.Content.ReadAsStringAsync();
        string responseString = JsonSerializer.Deserialize<string>(responseContent);

        // Assert
        Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);
        Assert.Equal($"File {relativePath} does not exist.", responseString);
    }
}
