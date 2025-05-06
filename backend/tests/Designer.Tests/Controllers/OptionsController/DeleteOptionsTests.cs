using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.OptionsController;

public class DeleteOptionsTests : DesignerEndpointsTestsBase<DeleteOptionsTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public DeleteOptionsTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    private const string Org = "ttd";
    private const string Developer = "testUser";

    [Fact]
    public async Task Delete_Returns_200OK_When_Deleting_OptionsList()
    {
        // Arrange
        const string Repo = "app-with-options";
        const string OptionsListId = "test-options";

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
        Assert.Equal($"The options file {OptionsListId}.json has been deleted.", responseDocument.RootElement.ToString());
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
        Assert.Equal($"The options file {OptionsListId}.json has been deleted.", responseDocument.RootElement.ToString());
    }
}
