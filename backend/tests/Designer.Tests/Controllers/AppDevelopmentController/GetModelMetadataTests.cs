using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class GetModelMetadataTests : DisagnerEndpointsTestsBase<GetFormLayoutsTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/app-development";

        public GetModelMetadataTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet3", "TestData/Model/Metadata/HvemErHvem.json")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "TestData/Model/Metadata/HvemErHvem.json")]
        public async Task GetModelMetadata_Should_Return(string org, string app, string developer, string layoutSetName, string expectedModelMetadataPath)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string expectedModelMetadata = await AddModelMetadataToRepo(TestRepoPath, expectedModelMetadataPath);

            string url = $"{VersionPrefix(org, targetRepository)}/model-metadata?layoutSetName={layoutSetName}";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string responseContent = await response.Content.ReadAsStringAsync();

            responseContent.Should().Be(expectedModelMetadata);
            JsonUtils.DeepEquals(expectedModelMetadata, responseContent).Should().BeTrue();
        }

        private async Task<string> AddModelMetadataToRepo(string createdFolderPath, string expectedModelMetadataPath)
        {
            string modelMetadata = SharedResourcesHelper.LoadTestDataAsString(expectedModelMetadataPath);
            string filePath = Path.Combine(createdFolderPath, "App", "models", "HvemErHvem_M.metadata.json");
            await File.WriteAllTextAsync(filePath, modelMetadata);
            return modelMetadata;
        }
    }
}
