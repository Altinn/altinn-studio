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
    public class GetAppMetadataModelIds : DisagnerEndpointsTestsBase<GetAppMetadataModelIds>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/app-development";

        public GetAppMetadataModelIds(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "app-with-layoutsets", "testUser")]
        public async Task GetAppMetadataModelIds_Should_Return_ModelIdsList(string org, string app, string developer)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);


            string url = $"{VersionPrefix(org, targetRepository)}/model-ids";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string responseContent = await response.Content.ReadAsStringAsync();

            responseContent.Should().Be("[\"datamodel\",\"HvemErHvem_M\"]");
        }

        [Theory]
        [InlineData("ttd", "empty-app-pref-json", "testUser")]
        public async Task GetAppMetadataModelIds_NoModelsInAppMetadata_Should_Return_EmptyArray(string org, string app, string developer)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);

            string url = $"{VersionPrefix(org, targetRepository)}/model-ids";
            using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

            using var response = await HttpClient.SendAsync(httpRequestMessage);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            
            string responseContent = await response.Content.ReadAsStringAsync();
            
            responseContent.Should().Be("[]");
        }
    }
}
