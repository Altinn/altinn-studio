using System.IO;
using System.Net.Http;
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

public class DeleteOptionsTests
    : DesignerEndpointsTestsBase<DeleteOptionsTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    public DeleteOptionsTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    private const string Org = "ttd";
    private const string Developer = "testUser";

    [Theory]
    [InlineData("app-with-layoutsets", "test-options")]
    [InlineData("app-with-options-v9", "unused-options")]
    public async Task Delete_Returns_200OK_When_Deleting_OptionsList(string repo, string optionsListId)
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, repo, Developer, targetRepository);

        string apiUrl = $"/designer/api/{Org}/{targetRepository}/options/{optionsListId}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Delete, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        JsonDocument responseDocument = JsonDocument.Parse(responseBody);

        // Assert
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equal(
            $"The options file {optionsListId}.json has been deleted.",
            responseDocument.RootElement.ToString()
        );
        Assert.False(File.Exists(GetOptionsListPath(targetRepository, optionsListId)));
    }

    [Theory]
    [InlineData("app-with-options", "test-options")]
    [InlineData("app-with-options-v9", "fruits")]
    public async Task Delete_Returns_409Conflict_When_OptionsList_Is_In_Use(string repo, string optionsListId)
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, repo, Developer, targetRepository);

        string apiUrl = $"/designer/api/{Org}/{targetRepository}/options/{optionsListId}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Delete, apiUrl);

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
        Assert.True(File.Exists(GetOptionsListPath(targetRepository, optionsListId)));
    }

    [Fact]
    public async Task Delete_Returns_200OK_When_OptionsList_Does_Not_Exist()
    {
        // Arrange
        const string Repo = "empty-app";
        const string OptionsListId = "non-existing-options";

        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, Repo, Developer, targetRepository);

        string apiUrl = $"/designer/api/{Org}/{targetRepository}/options/{OptionsListId}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Delete, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        JsonDocument responseDocument = JsonDocument.Parse(responseBody);

        // Assert
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equal(
            $"The options file {OptionsListId}.json has been deleted.",
            responseDocument.RootElement.ToString()
        );
    }

    private static string GetOptionsListPath(string repository, string optionsListId) =>
        Path.Combine(
            TestDataHelper.GetTestDataRepositoryDirectory(Org, repository, Developer),
            "App",
            "options",
            $"{optionsListId}.json"
        );
}
