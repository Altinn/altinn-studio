using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Utils;
using FluentAssertions;
using JetBrains.Annotations;
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
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1", "layoutFile1InSet1")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "layoutFile1")]
        public async Task DeleteFormLayout_ShouldDeleteLayoutFile_AndReturnOk(string org, string app, string developer, [CanBeNull] string layoutSetName, string layoutName)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/form-layout/{layoutName}?layoutSetName={layoutSetName}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, url);

            using var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string relativePath = string.IsNullOrEmpty(layoutSetName)
                ? $"App/ui/layouts/{layoutName}.json"
                : $"App/ui/{layoutSetName}/layouts/{layoutName}.json";
            string layoutFilePath = Path.Combine(CreatedFolderPath, relativePath);
            File.Exists(layoutFilePath).Should().BeFalse();
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1", "nonExistingLayoutFile")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "nonExistingLayoutFile")]
        public async Task DeleteFormLayout_NonExistingFile_Should_AndReturnNotFound(string org, string app, string developer, string layoutSetName, string layoutName)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/form-layout/{layoutName}?layoutSetName={layoutSetName}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, url);

            using var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }
}
