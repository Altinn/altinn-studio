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

    [Theory]
    [InlineData("ttd", "app-with-layoutsets", "testUser", "test-options")]
    public async Task Delete_Returns_200_When_Deleting_OptionList(string org, string repo, string developer, string optionListId)
    {
        // Arrange
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, repo, developer, targetRepository);

        string apiUrl = $"/designer/api/{org}/{targetRepository}/options/{optionListId}";
        HttpRequestMessage httpRequestMessage = new(HttpMethod.Delete, apiUrl);

        // Act
        HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        JsonDocument responseDocument = JsonDocument.Parse(responseBody);

        // Assert
        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equal($"The options file {optionListId}.json was successfully deleted.", responseDocument.RootElement.ToString());
    }
}
