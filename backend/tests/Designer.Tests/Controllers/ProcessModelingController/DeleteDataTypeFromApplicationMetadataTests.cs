using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ProcessModelingController
{
    public class DeleteDataTypeFromApplicationMetadataTests : DisagnerEndpointsTestsBase<DeleteDataTypeFromApplicationMetadataTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository, string dataTypeId) => $"/designer/api/{org}/{repository}/process-modelling/data-type/{dataTypeId}";

        public DeleteDataTypeFromApplicationMetadataTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "empty-app", "testUser", "ref-data-as-pdf")]
        public async Task DeleteDataTypeFromApplicationMetadata_ShouldDeleteDataTypeAndReturnOK(string org, string app, string developer, string dataTypeId)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string url = VersionPrefix(org, targetRepository, dataTypeId);

            using var request = new HttpRequestMessage(HttpMethod.Delete, url)
            {
                Content = new StringContent(string.Empty, Encoding.UTF8, "application/json")
            };
            using var response = await HttpClient.SendAsync(request);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            string appMetadataString = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/config/applicationmetadata.json");
            Application appMetadata = JsonSerializer.Deserialize<Application>(appMetadataString, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            appMetadata.DataTypes.Count.Should().Be(0);
        }

        [Theory]
        [InlineData("ttd", "apps-test", "testUser", "ref-data-as-pdf")]
        public async Task DeletePolicyFromPolicyFile_ShouldReturnOK(string org, string app, string developer, string dataTypeId)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string url = VersionPrefix(org, targetRepository, dataTypeId);

            using var request = new HttpRequestMessage(HttpMethod.Delete, url)
            {
                Content = new StringContent(string.Empty, Encoding.UTF8, "application/json")
            };
            using var response = await HttpClient.SendAsync(request);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

        }
    }
}
