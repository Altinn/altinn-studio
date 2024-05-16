using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.OpenApi.Models;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class GetModelMetadataTests : DisagnerEndpointsTestsBase<GetModelMetadataTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/app-development";

        public GetModelMetadataTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1", null, "TestData/Model/Metadata/datamodel.json")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, null, "TestData/Model/Metadata/datamodel.json")]
        public async Task GetModelMetadata_Should_Return_ModelMetadata_When_DataModelName_IsNull(string org, string app, string developer, string layoutSetName, string dataModelName, string expectedModelMetadataPath)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string expectedModelMetadata = await AddModelMetadataToRepo(TestRepoPath, expectedModelMetadataPath);
            string url = $"{VersionPrefix(org, targetRepository)}/model-metadata?layoutSetName={layoutSetName}&dataModelName={dataModelName}";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string responseContent = await response.Content.ReadAsStringAsync();

            responseContent.Should().Be(expectedModelMetadata);
            JsonUtils.DeepEquals(expectedModelMetadata, responseContent).Should().BeTrue();
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1", "datamodel", "TestData/Model/Metadata/datamodel.json")]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null, "datamodel", "TestData/Model/Metadata/datamodel.json")]
        public async Task GetModelMetadata_Should_Return_ModelMetadata_When_DataModelName_IsSpecified(string org, string app, string developer, string layoutSetName, string dataModelName, string expectedModelMetadataPath)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string expectedModelMetadata = await AddModelMetadataToRepo(TestRepoPath, expectedModelMetadataPath);

            string url = $"{VersionPrefix(org, targetRepository)}/model-metadata?layoutSetName={layoutSetName}&dataModelName={dataModelName}";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string responseContent = await response.Content.ReadAsStringAsync();

            responseContent.Should().Be(expectedModelMetadata);
            JsonUtils.DeepEquals(expectedModelMetadata, responseContent).Should().BeTrue();
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet3")]
        [InlineData("ttd", "app-without-layoutsets-mismatch-modelname", "testUser", null)]
        public async Task GetModelMetadata_Should_Return_404_When_No_Datamodel_Exists_FromLayoutSetParam(string org, string app, string developer, string layoutSetName)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/model-metadata?layoutSetName={layoutSetName}";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "datamodel3")]
        [InlineData("ttd", "app-without-layoutsets-mismatch-modelname", "testUser", null)]
        public async Task GetModelMetadata_Should_Return_404_When_No_Datamodel_Exists_FromDataModelNameParam(string org, string app, string developer, string dataModelName)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/model-metadata?dataModelName={dataModelName}";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
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
