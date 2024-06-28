using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.OptionsController;

public class DeleteTests : DisagnerEndpointsTestsBase<DeleteTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public DeleteTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    private const string Org = "ttd";
    private const string Developer = "testUser";

    [Fact]
    public async Task Delete_Returns_200OK_When_Deleting_OptionList()
    {
        // Arrange
        const string repo = "app-with-options";
        const string optionListId = "test-options";

        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, repo, Developer, targetRepository);

        string apiUrl = $"/designer/api/{Org}/{targetRepository}/options/{optionListId}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Delete, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        JsonDocument responseDocument = JsonDocument.Parse(responseBody);

        // Assert
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equal($"The options file {optionListId}.json was successfully deleted.", responseDocument.RootElement.ToString());
    }

    [Fact]
    public async Task Delete_Returns_404NotFound_When_OptionList_Does_Not_Exist()
    {
        // Arrange
        const string repo = "empty-app";
        const string optionListId = "non-existing-options";

        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, repo, Developer, targetRepository);

        string apiUrl = $"/designer/api/{Org}/{targetRepository}/options/{optionListId}";
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Delete, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        JsonDocument responseDocument = JsonDocument.Parse(responseBody);

        // Assert
        Assert.Equal(StatusCodes.Status404NotFound, (int)response.StatusCode);
        Assert.Equal($"The options file {optionListId}.json does not exist.", responseDocument.RootElement.ToString());
    }
}
