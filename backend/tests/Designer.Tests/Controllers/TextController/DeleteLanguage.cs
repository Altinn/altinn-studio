using System.Threading.Tasks;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.TextController
{
    public class DeleteLanguage : TextControllerTestsBase<DeleteLanguage>
    {

        public DeleteLanguage(WebApplicationFactory<Altinn.Studio.Designer.Controllers.TextController> factory) : base(factory)
        {
        }


        [Theory]
        [InlineData("ttd", "hvem-er-hvem", "testUser", "nb")]
        public async Task DeleteLanguage_WithValidInput_ReturnsOk(string org, string app, string developer, string language)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);
            string url = $"{VersionPrefix(org, targetRepository)}/language/{language}";
            TestDataHelper.FileExistsInRepo(org, targetRepository, developer, $"App/config/texts/resource.{language}.json")
                .Should().BeTrue();

            // Act
            using var response = await HttpClient.Value.DeleteAsync(url);

            // Assert
            Assert.Equal(200, (int)response.StatusCode);
            TestDataHelper.FileExistsInRepo(org, targetRepository, developer, $"App/config/texts/resource.{language}.json")
                .Should().BeFalse();
        }
    }
}
