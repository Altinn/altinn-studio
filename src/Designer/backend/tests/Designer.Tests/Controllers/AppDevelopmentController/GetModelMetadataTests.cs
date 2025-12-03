using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class GetModelMetadataTests : DesignerEndpointsTestsBase<GetModelMetadataTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/app-development";

        public GetModelMetadataTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1", null)]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, null)]
        public async Task GetModelMetadata_Should_Return_ModelMetadata_Based_On_LayoutSet_When_DataModelName_Is_Undefined(string org, string app, string developer, string layoutSetName, string dataModelName)
        {
            // Arrange
            (string url, string expectedModelMetadata) = await ArrangeGetModelMetadataTest(org, app, developer, layoutSetName, dataModelName);
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            // Act
            using var response = await HttpClient.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(expectedModelMetadata, responseContent);
            Assert.True(JsonUtils.DeepEquals(expectedModelMetadata, responseContent));
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1", "datamodel")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "datamodel")]
        public async Task GetModelMetadata_Should_Return_ModelMetadata_When_DataModelName_Is_Specified(string org, string app, string developer, string layoutSetName, string dataModelName)
        {
            // Arrange
            (string url, string expectedModelMetadata) = await ArrangeGetModelMetadataTest(org, app, developer, layoutSetName, dataModelName);
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            // Act
            using var response = await HttpClient.SendAsync(httpRequestMessage);
            string responseContent = await response.Content.ReadAsStringAsync();

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(expectedModelMetadata, responseContent);
            Assert.True(JsonUtils.DeepEquals(expectedModelMetadata, responseContent));
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet3", null)]
        [InlineData("ttd", "app-without-layoutsets-mismatch-modelname", "testUser", null, null)]
        [InlineData("ttd", "app-with-layoutsets", "testUser", null, "non-existing-dataModelName")]
        public async Task GetModelMetadata_Should_Return_404_When_No_Corresponding_Datamodel_Exists(string org, string app, string developer, string layoutSetName, string dataModelName)
        {
            // Arrange
            (string url, _) = await ArrangeGetModelMetadataTest(org, app, developer, layoutSetName, dataModelName);
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            // Act
            using var response = await HttpClient.SendAsync(httpRequestMessage);

            // Assert
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        private async Task<string> AddModelMetadataToRepo(string createdFolderPath, string expectedModelMetadataPath)
        {
            string modelMetadata = SharedResourcesHelper.LoadTestDataAsString(expectedModelMetadataPath);
            string filePath = Path.Combine(createdFolderPath, "App", "models", "HvemErHvem_M.metadata.json");
            await File.WriteAllTextAsync(filePath, modelMetadata);
            return modelMetadata;
        }

        private async Task<(string url, string expectedModelMetadata)> ArrangeGetModelMetadataTest(string org, string app, string developer, string layoutSetName, string dataModelName)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            const string ExpectedModelMetadataPath = "TestData/Model/Metadata/datamodel.json";
            string expectedModelMetadata = await AddModelMetadataToRepo(TestRepoPath, ExpectedModelMetadataPath);

            string url = $"{VersionPrefix(org, targetRepository)}/model-metadata?layoutSetName={layoutSetName}&dataModelName={dataModelName}";

            return (url, expectedModelMetadata);
        }
    }
}
