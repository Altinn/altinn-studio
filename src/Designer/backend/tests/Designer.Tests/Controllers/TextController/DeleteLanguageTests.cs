using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.TextController
{
    public class DeleteLanguageTests : DesignerEndpointsTestsBase<DeleteLanguageTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/text";
        public DeleteLanguageTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }


        [Theory]
        [InlineData("ttd", "hvem-er-hvem", "testUser", "nb")]
        public async Task DeleteLanguage_WithValidInput_ReturnsOk(string org, string app, string developer, string language)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string url = $"{VersionPrefix(org, targetRepository)}/language/{language}";
            Assert.True(TestDataHelper.FileExistsInRepo(org, targetRepository, developer, $"App/config/texts/resource.{language}.json"));

            // Act
            using var response = await HttpClient.DeleteAsync(url);

            // Assert
            Assert.Equal(200, (int)response.StatusCode);
            Assert.False(TestDataHelper.FileExistsInRepo(org, targetRepository, developer,
                $"App/config/texts/resource.{language}.json"));
        }
    }
}
