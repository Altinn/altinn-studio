using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.AccessManagement.Tests.Utils;
using Altinn.Platform.Storage.Interface.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ProcessModelingController
{
    public class AddDataTypeToApplicationMetadataTests :
        DesignerEndpointsTestsBase<AddDataTypeToApplicationMetadataTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix(string org, string repository, string dataTypeId, string taskId) =>
            $"/designer/api/{org}/{repository}/process-modelling/data-type/{dataTypeId}?taskId={taskId}";

        public AddDataTypeToApplicationMetadataTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Theory]
        [InlineData("ttd", "empty-app", "testUser", "paymentInformation-1234", "task_1")]
        public async Task AddDataTypeToApplicationMetadata_ShouldAddDataTypeAndReturnOK(string org, string app,
            string developer, string dataTypeId, string taskId)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string url = VersionPrefix(org, targetRepository, dataTypeId, taskId);

            var content = new StringContent("[]", Encoding.UTF8, "application/json");
            using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };
            using var response = await HttpClient.SendAsync(request);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string appMetadataString = TestDataHelper.GetFileFromRepo(org, targetRepository, developer,
                "App/config/applicationmetadata.json");
            Application appMetadata = JsonSerializer.Deserialize<Application>(appMetadataString,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            DataType expectedDataType = new()
            {
                Id = dataTypeId,
                AllowedContentTypes = new List<string>() { "application/json" },
                MaxCount = 1,
                MinCount = 0,
                TaskId = taskId,
                EnablePdfCreation = false,
                EnableFileScan = false,
                ValidationErrorOnPendingFileScan = false,
                EnabledFileAnalysers = new List<string>(),
                EnabledFileValidators = new List<string>()
            };

            Assert.Equal(2, appMetadata.DataTypes.Count);
            AssertionUtil.AssertEqualTo(expectedDataType,
                appMetadata.DataTypes.Find(dataType => dataType.Id == dataTypeId));
            Assert.Equal(taskId, appMetadata.DataTypes.Find(dataType => dataType.Id == dataTypeId).TaskId);
        }

        [Theory]
        [InlineData("ttd", "empty-app", "testUser", "paymentInformation-1234", "task_1", new[] { "app:owned" })]
        public async Task AddDataTypeWithAllowedContributersToApplicationMetadata_ShouldAddDataTypeAndReturnOK(
            string org, string app,
            string developer, string dataTypeId, string taskId, string[] allowedContributers)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string url = VersionPrefix(org, targetRepository, dataTypeId, taskId);

            string jsonPayload = JsonSerializer.Serialize(allowedContributers.ToList());
            var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
            using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };
            using var response = await HttpClient.SendAsync(request);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string appMetadataString = TestDataHelper.GetFileFromRepo(org, targetRepository, developer,
                "App/config/applicationmetadata.json");

            Application appMetadata = JsonSerializer.Deserialize<Application>(appMetadataString,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            DataType expectedDataType = new()
            {
                Id = dataTypeId,
                AllowedContentTypes = new List<string>() { "application/json" },
                MaxCount = 1,
                MinCount = 0,
                TaskId = taskId,
                EnablePdfCreation = false,
                EnableFileScan = false,
                ValidationErrorOnPendingFileScan = false,
                EnabledFileAnalysers = new List<string>(),
                EnabledFileValidators = new List<string>(),
                AllowedContributers = new List<string> { "app:owned" }
            };

            Assert.Equal(2, appMetadata.DataTypes.Count);
            AssertionUtil.AssertEqualTo(expectedDataType,
                appMetadata.DataTypes.Find(dataType => dataType.Id == dataTypeId));
            Assert.Equal(taskId, appMetadata.DataTypes.Find(dataType => dataType.Id == dataTypeId).TaskId);
        }

        [Theory]
        [InlineData("ttd", "empty-app", "testUser", "ref-data-as-pdf", "task_1")]
        public async Task AddDataTypeToApplicationMetadataWhenExists_ShouldNotAddDataTypeAndReturnOK(string org,
            string app, string developer, string dataTypeId, string taskId)
        {
            string targetRepository = TestDataHelper.GenerateTestRepoName();
            await CopyRepositoryForTest(org, app, developer, targetRepository);
            string url = VersionPrefix(org, targetRepository, dataTypeId, taskId);
            var content = new StringContent("[]", Encoding.UTF8, "application/json");
            using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };
            using var response = await HttpClient.SendAsync(request);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            string appMetadataString = TestDataHelper.GetFileFromRepo(org, targetRepository, developer,
                "App/config/applicationmetadata.json");
            Application appMetadata = JsonSerializer.Deserialize<Application>(appMetadataString,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            Assert.Single(appMetadata.DataTypes);
        }
    }
}
