using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Controllers;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.TestController
{
    public class SaveResource : TextControllerTestsBase<SaveResource>
    {

        public SaveResource(WebApplicationFactory<TextController> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "hvem-er-hvem", "testUser", "sr", "{\"language\": \"sr\",\"resources\": [{\"id\": \"ServiceName\",\"value\": \"ko-je-ko\"}]}")]
        public async Task SaveResource_WithValidInput_ReturnsOk(string org, string app, string developer, string lang, string payload)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/language/{lang}";

            var httpContent = new StringContent(payload, Encoding.UTF8, MediaTypeNames.Application.Json);

            // Act
            using var response = await HttpClient.Value.PostAsync(url, httpContent);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            TestDataHelper.FileExistsInRepo(org, targetRepository, developer, $"App/config/texts/resource.{lang}.json").Should().BeTrue();
            JsonUtils.DeepEquals(payload, TestDataHelper.GetFileFromRepo(org, targetRepository, developer, $"App/config/texts/resource.{lang}.json")).Should().BeTrue();
        }


    }
}
