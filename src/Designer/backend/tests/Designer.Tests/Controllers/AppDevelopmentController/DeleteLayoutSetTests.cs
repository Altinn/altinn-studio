#nullable disable
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.AppDevelopmentController
{
    public class DeleteLayoutSetTests(WebApplicationFactory<Program> factory)
          : DesignerEndpointsTestsBase<DeleteLayoutSetTests>(factory), IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) =>
            $"/designer/api/{org}/{repository}/app-development";

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet2")]
        public async Task DeleteLayoutSet_SetWithoutDataTypeConnection_ReturnsOk(string org, string app, string developer,
            string layoutSetToDeleteId)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            LayoutSets layoutSetsBefore = await GetLayoutSetsFile(org, targetRepository, developer);

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetToDeleteId}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            LayoutSets layoutSetsAfter = await GetLayoutSetsFile(org, targetRepository, developer);

            Assert.True(layoutSetsBefore.Sets.Exists(set => set.Id == layoutSetToDeleteId));
            Assert.Equal(layoutSetsBefore.Sets.Count - 1, layoutSetsAfter.Sets.Count);
            Assert.False(layoutSetsAfter.Sets.Exists(set => set.Id == layoutSetToDeleteId));
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet1")]
        public async Task DeleteLayoutSet_SetWithDataTypeConnection_ReturnsOk(string org, string app, string developer,
            string layoutSetToDeleteId)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string connectedDataType = "datamodel";
            string connectedTaskId = "Task_1";
            LayoutSets layoutSetsBefore = await GetLayoutSetsFile(org, targetRepository, developer);
            Application appMetadataBefore = await GetApplicationMetadataFile(org, targetRepository, developer);

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetToDeleteId}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            LayoutSets layoutSetsAfter = await GetLayoutSetsFile(org, targetRepository, developer);
            Application appMetadataAfter = await GetApplicationMetadataFile(org, targetRepository, developer);

            Assert.Equal(connectedTaskId, appMetadataBefore.DataTypes.Find(dataType => dataType.Id == connectedDataType).TaskId);
            Assert.True(layoutSetsBefore.Sets.Exists(set => set.Id == layoutSetToDeleteId));
            Assert.Equal(layoutSetsBefore.Sets.Count - 1, layoutSetsAfter.Sets.Count);
            Assert.Null(appMetadataAfter.DataTypes.Find(dataType => dataType.Id == connectedDataType).TaskId);
            Assert.False(layoutSetsAfter.Sets.Exists(set => set.Id == layoutSetToDeleteId));
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet2")]
        public async Task DeleteLayoutSet_DeletesRelatedLayoutSetFolder_ReturnsOk(string org, string app, string developer,
            string layoutSetToDeleteId)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            Assert.True(LayoutSetFolderExists(org, targetRepository, developer, layoutSetToDeleteId));

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetToDeleteId}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            Assert.False(LayoutSetFolderExists(org, targetRepository, developer, layoutSetToDeleteId));
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "non-existing-layout-set")]
        public async Task DeleteLayoutSet_IdNotFound_ReturnsUnAlteredLayoutSets(string org, string app, string developer,
            string layoutSetToDeleteId)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string layoutSetsBefore = TestDataHelper.GetFileFromRepo(org, app, developer, "App/ui/layout-sets.json");

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetToDeleteId}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string responseContent = await response.Content.ReadAsStringAsync();

            Assert.True(JsonUtils.DeepEquals(layoutSetsBefore, responseContent));
        }

        [Theory]
        [InlineData("ttd", "app-without-layoutsets", "testUser", null)]
        public async Task DeleteLayoutSet_AppWithoutLayoutSets_ReturnsNotFound(string org, string app, string developer,
            string layoutSetToDeleteId)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetToDeleteId}";

            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser", "layoutSet3",
                "layoutSet2", "layoutFile1InSet2", "subform-component-id")]
        public async Task DeleteLayoutSet_RemovesComponentsReferencingLayoutSet(string org, string app, string developer, string layoutSetToDeleteId,
                string layoutSetWithRef, string layoutSetFile, string deletedComponentId)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/layout-set/{layoutSetToDeleteId}";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            JsonNode formLayout = (await GetFormLayouts(org, targetRepository, developer, layoutSetWithRef))[layoutSetFile];
            JsonArray layout = formLayout["data"]?["layout"] as JsonArray;

            bool componentsReferencingDeletedLayoutSet = layout
                .Where(jsonNode => jsonNode["layoutSet"] != null)
                .Any(jsonNode => jsonNode["layoutSet"].GetValue<string>() == deletedComponentId);

            Assert.False(componentsReferencingDeletedLayoutSet, $"No components should reference the deleted layout set {deletedComponentId}");

            Assert.NotNull(layout);


        }

        [Theory]
        [InlineData("ttd", "testUser", "layoutSet")]
        public async Task DeleteLayoutSet_DeletesAssociatedSummary2Components_ReturnsOk(string org, string developer, string layoutSetName)
        {
            string actualApp = "app-with-summary2-components";
            string app = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, actualApp, developer, app);

            string url = $"{VersionPrefix(org, app)}/layout-set/{layoutSetName}";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string expectedApp = "app-with-summary2-components-after-deleting-references";

            string[] layoutPaths = [
                "layoutSet/layouts/Side1.json",
                "layoutSet/layouts/Side2.json",
                "layoutSet2/layouts/Side1.json",
                "layoutSet2/layouts/Side2.json"
            ];

            layoutPaths.ToList().ForEach(file =>
            {
                string actual = TestDataHelper.GetFileFromRepo(org, app, developer, $"App/ui/{file}");
                string expected = TestDataHelper.GetFileFromRepo(org, expectedApp, developer, $"App/ui/{file}");
                Assert.True(JsonUtils.DeepEquals(actual, expected));
            });
        }

        private async Task<LayoutSets> GetLayoutSetsFile(string org, string app, string developer)
        {
            AltinnGitRepositoryFactory altinnGitRepositoryFactory =
                new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
            AltinnAppGitRepository altinnAppGitRepository =
                altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);

            return await altinnAppGitRepository.GetLayoutSetsFile();
        }

        private async Task<Dictionary<string, JsonNode>> GetFormLayouts(string org, string app, string developer, string layoutSetName)
        {
            AltinnGitRepositoryFactory altinnGitRepositoryFactory =
            new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
            AltinnAppGitRepository altinnAppGitRepository =
            altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            Dictionary<string, JsonNode> formLayouts = await altinnAppGitRepository.GetFormLayouts(layoutSetName);
            return formLayouts;
        }

        private async Task<Application> GetApplicationMetadataFile(string org, string app, string developer)
        {
            AltinnGitRepositoryFactory altinnGitRepositoryFactory =
                new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
            AltinnAppGitRepository altinnAppGitRepository =
                altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);

            return await altinnAppGitRepository.GetApplicationMetadata();
        }

        private bool LayoutSetFolderExists(string org, string app, string developer, string layoutSetName)
        {
            AltinnGitRepositoryFactory altinnGitRepositoryFactory =
                new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
            AltinnAppGitRepository altinnAppGitRepository =
                altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);

            return altinnAppGitRepository.DirectoryExistsByRelativePath($"App/ui/{layoutSetName}");
        }
    }
}

