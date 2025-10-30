#nullable disable
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.OptionsController;

public class UpdateOptionListIdTests(WebApplicationFactory<Program> factory)
    : DesignerEndpointsTestsBase<UpdateOptionListIdTests>(factory), IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string Developer = "testUser";

    [Fact]
    public async Task Put_Returns_200OK_With_Same_File_Content_When_Updating_Id()
    {
        // Arrange
        const string Repo = "app-with-options";
        const string OptionsListId = "test-options";
        const string NewOptionListId = "new-option-list-id";

        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, Repo, Developer, targetRepository);
        var originalOptionList = TestDataHelper.GetFileFromRepo(Org, Repo, Developer, $"App/options/{OptionsListId}.json");

        string apiUrl = $"/designer/api/{Org}/{targetRepository}/options/change-name/{OptionsListId}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, apiUrl);
        httpRequestMessage.Content =
            new StringContent($"\"{NewOptionListId}\"", Encoding.UTF8, MediaTypeNames.Application.Json);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        var optionListWithNewId = TestDataHelper.GetFileFromRepo(Org, targetRepository, Developer, $"App/options/{NewOptionListId}.json");
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equal(originalOptionList, optionListWithNewId);
    }

    [Fact]
    public async Task Put_Returns_400BadRequest_When_Updating_Id_To_Existing_Option_File_Name()
    {
        // Arrange
        const string Repo = "app-with-options";
        const string OptionsListId = "test-options";
        const string NewOptionListId = "other-options";

        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, Repo, Developer, targetRepository);
        var originalOptionList = TestDataHelper.GetFileFromRepo(Org, Repo, Developer, $"App/options/{OptionsListId}.json");

        string apiUrl = $"/designer/api/{Org}/{targetRepository}/options/change-name/{OptionsListId}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Put, apiUrl);
        httpRequestMessage.Content =
            new StringContent($"\"{NewOptionListId}\"", Encoding.UTF8, MediaTypeNames.Application.Json);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        var responseContent = await response.Content.ReadAsStringAsync();
        string responseString = JsonSerializer.Deserialize<string>(responseContent);

        // Assert
        var optionListWithSameId = TestDataHelper.GetFileFromRepo(Org, targetRepository, Developer, $"App/options/{OptionsListId}.json");
        Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);
        Assert.Equal($"Suggested file name {NewOptionListId}.json already exists.", responseString);
        Assert.Equal(originalOptionList, optionListWithSameId);
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
        httpRequestMessage.Content =
            new StringContent($"\"{NewOptionListId}\"", Encoding.UTF8, MediaTypeNames.Application.Json);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        var responseContent = await response.Content.ReadAsStringAsync();
        string responseString = JsonSerializer.Deserialize<string>(responseContent);

        // Assert
        Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);
        Assert.Equal($"File {relativePath} does not exist.", responseString);
    }
}
