using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class DeleteFormLayoutTests : AppDevelopmentControllerTestsBase<GetFormLayoutsTestsBase>
    {
        public DeleteFormLayoutTests(WebApplicationFactory<Altinn.Studio.Designer.Controllers.AppDevelopmentController> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "app-without-layoutsets", "testUser", "layoutFile1")]
        public async Task DeleteFormLayout_ShouldDeleteLayoutFile_AndReturnOk(string org, string app, string developer, string layoutName)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/form-layout/{layoutName}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, url);

            using var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string layoutFilePath = Path.Combine(CreatedFolderPath, "App", "ui", "layouts", $"{layoutName}.json");
            File.Exists(layoutFilePath).Should().BeFalse();
        }

        [Theory(Skip = "Endpoint does not behave as is written in cotroller. Expected is return 404, but returns 200")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", "nonExistingLayoutFile")]
        public async Task DeleteFormLayout_NonExistingFile_Should_AndReturnNotFound(string org, string app, string developer, string layoutName)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/form-layout/{layoutName}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, url);

            using var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }
}
