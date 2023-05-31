using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Threading.Tasks;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class UpdateFormLayoutNameTests : AppDevelopmentControllerTestsBase<GetFormLayoutsTestsBase>
    {
        public UpdateFormLayoutNameTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.AppDevelopmentController> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1", "layoutFile1InSet1", "newLayoutName")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "layoutFile1", "newLayoutName")]
        public async Task UpdateFormLayoutName_Change_FileName_And_ReturnsOk(string org, string app, string developer, string layoutSetName, string layoutName, string newLayoutName)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/form-layout-name/{layoutName}?layoutSetName={layoutSetName}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                // This is something that should be changed in controller. The controller should not expect a string in quotes.
                // And if endpoint is expecting "application/json" media type, json file should be sent.
                Content = new StringContent($"\"{newLayoutName}\"", Encoding.UTF8, MediaTypeNames.Application.Json)
            };

            using var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string relativeOldLayoutPath = string.IsNullOrEmpty(layoutSetName)
                ? $"App/ui/layouts/{layoutName}.json"
                : $"App/ui/{layoutSetName}/layouts/{layoutName}.json";
            string relativeNewLayoutPath = string.IsNullOrEmpty(layoutSetName)
                ? $"App/ui/layouts/{newLayoutName}.json"
                : $"App/ui/{layoutSetName}/layouts/{newLayoutName}.json";
            string oldLayoutPath = Path.Combine(CreatedFolderPath, relativeOldLayoutPath);
            string newLayoutPath = Path.Combine(CreatedFolderPath, relativeNewLayoutPath);
            File.Exists(oldLayoutPath).Should().BeFalse();
            File.Exists(newLayoutPath).Should().BeTrue();
        }

        [Theory]
        [InlineData("ttd", "app-without-layoutsets", "testUser", "nonExistingLayoutName", "newLayoutName")]
        public async Task UpdateFormLayoutName_NonExistingName_ShouldReturnNotFound(string org, string app, string developer, string layoutName, string newLayoutName)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/form-layout-name/{layoutName}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent($"\"{newLayoutName}\"", Encoding.UTF8, MediaTypeNames.Application.Json)
            };

            using var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

    }
}
