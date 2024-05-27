using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.PolicyAdmin.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Controllers.PolicyControllerTests;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Newtonsoft.Json;
using Polly;
using Xunit;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace Designer.Tests.Controllers.ProcessModelingController
{
    public class AddDataTypeToApplicationMetadataTests : DisagnerEndpointsTestsBase<AddDataTypeToApplicationMetadataTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository, string dataTypeId) => $"/designer/api/{org}/{repository}/process-modelling/data-type/{dataTypeId}";

        public AddDataTypeToApplicationMetadataTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "empty-app", "testUser", "paymentInformation-1234")]
        public async Task AddDataTypeToApplicationMetadata_ShouldAddDataTypeAndReturnOK(string org, string app, string developer, string dataTypeId)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string url = VersionPrefix(org, targetRepository, dataTypeId);

            using var request = new HttpRequestMessage(HttpMethod.Post, url)
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
            DataType expectedDataType = new()
            {
                Id = dataTypeId,
                AllowedContentTypes = new List<string>() { "application/json" },
                MaxCount = 1,
                MinCount = 0,
                EnablePdfCreation = false,
                EnableFileScan = false,
                ValidationErrorOnPendingFileScan = false,
                EnabledFileAnalysers = new List<string>(),
                EnabledFileValidators = new List<string>()
            };

            appMetadata.DataTypes.Count.Should().Be(2);
            appMetadata.DataTypes.Find(dataType => dataType.Id == dataTypeId).Should().BeEquivalentTo(expectedDataType);
        }

        [Theory]
        [InlineData("ttd", "empty-app", "testUser", "ref-data-as-pdf")]
        public async Task AddDataTypeToApplicationMetadataWhenExists_ShouldNotAddDataTypeAndReturnOK(string org, string app, string developer, string dataTypeId)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string url = VersionPrefix(org, targetRepository, dataTypeId);
            using var request = new HttpRequestMessage(HttpMethod.Post, url)
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

            appMetadata.DataTypes.Count.Should().Be(1);
        }

        [Theory]
        [InlineData("ttd", "apps-test", "testUser", "paymentInformation-1234")]
        public async Task AddPolicyToPolicyFile_ShouldReturnOK(string org, string app,
            string developer, string dataTypeId)
        {

            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string url = VersionPrefix(org, targetRepository, dataTypeId);

            ResourcePolicy applicationPolicy = TestPolicyHelper.GenerateTestPolicy("ttd", targetRepository);


            using var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(JsonConvert.SerializeObject(applicationPolicy), Encoding.UTF8, MediaTypeNames.Application.Json)
            };

            using var response = await HttpClient.SendAsync(request);
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }
}
