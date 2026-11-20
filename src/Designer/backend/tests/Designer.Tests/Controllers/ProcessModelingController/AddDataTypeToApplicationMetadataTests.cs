using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.AccessManagement.Tests.Utils;
using Altinn.Platform.Storage.Interface.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

#pragma warning disable CS0618 // empty-app has no app-lib version, so Designer treats it as a v8 app

namespace Designer.Tests.Controllers.ProcessModelingController;

public class AddDataTypeToApplicationMetadataTests
    : DesignerEndpointsTestsBase<AddDataTypeToApplicationMetadataTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository, string dataTypeId, string taskId) =>
        $"/designer/api/{org}/{repository}/process-modelling/data-type/{dataTypeId}?taskId={taskId}";

    public AddDataTypeToApplicationMetadataTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    [Theory]
    [InlineData(8, "Task_1", null)]
    [InlineData(9, null, new[] { "Task_1" })]
    public async Task AddDataType_WritesTheFieldsTheAppVersionReads(
        int majorVersion,
        string expectedTaskId,
        string[] expectedTaskIds
    )
    {
        const string org = "ttd";
        const string developer = "testUser";
        const string dataTypeId = "signatureInformation";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, "empty-app", developer, targetRepository);
        TestDataHelper.WriteAppLibVersion(TestRepoPath, $"{majorVersion}.0.0");
        using var content = new StringContent("[]", Encoding.UTF8, "application/json");

        using var response = await HttpClient.PostAsync(
            VersionPrefix(org, targetRepository, dataTypeId, "Task_1"),
            content
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonObject dataType = DataTypeTaskBindingTestHelper.ReadDataType(TestRepoPath, dataTypeId);
        bool hasLegacyFlag = dataType.TryGetPropertyValue("enablePdfCreation", out JsonNode legacyFlag);
        Assert.Equal(majorVersion == 8, hasLegacyFlag);
        if (hasLegacyFlag)
        {
            Assert.False(legacyFlag.GetValue<bool>());
        }
        Assert.Equal(expectedTaskId, (string)dataType["taskId"]);
        Assert.Equal(expectedTaskIds, DataTypeTaskBindingTestHelper.ReadTaskIds(dataType));
    }

    [Theory]
    [InlineData("ttd", "empty-app", "testUser", "paymentInformation-1234", "task_1")]
    public async Task AddDataTypeToApplicationMetadata_ShouldAddDataTypeAndReturnOK(
        string org,
        string app,
        string developer,
        string dataTypeId,
        string taskId
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);
        string url = VersionPrefix(org, targetRepository, dataTypeId, taskId);

        var content = new StringContent("[]", Encoding.UTF8, "application/json");
        using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };
        using var response = await HttpClient.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string appMetadataString = TestDataHelper.GetFileFromRepo(
            org,
            targetRepository,
            developer,
            "App/config/applicationmetadata.json"
        );
        Application appMetadata = JsonSerializer.Deserialize<Application>(
            appMetadataString,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
        );
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
        };

        Assert.Equal(2, appMetadata.DataTypes.Count);
        AssertionUtil.AssertEqualTo(
            expectedDataType,
            appMetadata.DataTypes.Find(dataType => dataType.Id == dataTypeId)
        );
        Assert.Equal(taskId, appMetadata.DataTypes.Find(dataType => dataType.Id == dataTypeId).TaskId);
    }

    [Theory]
    [InlineData("ttd", "empty-app", "testUser", "paymentInformation-1234", "task_1", new[] { "app:owned" })]
    public async Task AddDataTypeWithAllowedContributorsToApplicationMetadata_ShouldAddDataTypeAndReturnOK(
        string org,
        string app,
        string developer,
        string dataTypeId,
        string taskId,
        string[] allowedContributors
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);
        string url = VersionPrefix(org, targetRepository, dataTypeId, taskId);

        string jsonPayload = JsonSerializer.Serialize(allowedContributors.ToList());
        var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
        using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };
        using var response = await HttpClient.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string appMetadataString = TestDataHelper.GetFileFromRepo(
            org,
            targetRepository,
            developer,
            "App/config/applicationmetadata.json"
        );

        Application appMetadata = JsonSerializer.Deserialize<Application>(
            appMetadataString,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
        );

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
            AllowedContributors = new List<string> { "app:owned" },
        };

        Assert.Equal(2, appMetadata.DataTypes.Count);
        AssertionUtil.AssertEqualTo(
            expectedDataType,
            appMetadata.DataTypes.Find(dataType => dataType.Id == dataTypeId)
        );
        Assert.Equal(taskId, appMetadata.DataTypes.Find(dataType => dataType.Id == dataTypeId).TaskId);
    }

    [Fact]
    public async Task AddDataType_WithAllowedContentTypes_RegistersGivenContentTypes()
    {
        const string org = "ttd";
        const string developer = "testUser";
        const string dataTypeId = "signatures-pdf-1234";
        const string taskId = "task_1";
        string[] allowedContentTypes = ["application/pdf", "application/json"];
        string[] allowedContributors = ["app:owned"];

        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, "empty-app", developer, targetRepository);
        string contentTypeQuery = string.Join(
            "&",
            allowedContentTypes.Select(contentType => $"allowedContentTypes={Uri.EscapeDataString(contentType)}")
        );
        string url = $"{VersionPrefix(org, targetRepository, dataTypeId, taskId)}&{contentTypeQuery}";

        string jsonPayload = JsonSerializer.Serialize(allowedContributors.ToList());
        var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
        using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };
        using var response = await HttpClient.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string appMetadataString = TestDataHelper.GetFileFromRepo(
            org,
            targetRepository,
            developer,
            "App/config/applicationmetadata.json"
        );
        Application appMetadata = JsonSerializer.Deserialize<Application>(
            appMetadataString,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
        );

        DataType dataType = Assert.Single(appMetadata.DataTypes, type => type.Id == dataTypeId);
        Assert.Equal(taskId, dataType.TaskId);
        Assert.Equal(allowedContentTypes, dataType.AllowedContentTypes);
        Assert.Equal(allowedContributors, dataType.AllowedContributors);
    }

    [Theory]
    [InlineData("ttd", "empty-app", "testUser", "ref-data-as-pdf", "task_1")]
    public async Task AddDataTypeToApplicationMetadataWhenExists_ShouldNotAddDataTypeAndReturnOK(
        string org,
        string app,
        string developer,
        string dataTypeId,
        string taskId
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);
        string url = VersionPrefix(org, targetRepository, dataTypeId, taskId);
        var content = new StringContent("[]", Encoding.UTF8, "application/json");
        using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };
        using var response = await HttpClient.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string appMetadataString = TestDataHelper.GetFileFromRepo(
            org,
            targetRepository,
            developer,
            "App/config/applicationmetadata.json"
        );
        Application appMetadata = JsonSerializer.Deserialize<Application>(
            appMetadataString,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
        );

        Assert.Single(appMetadata.DataTypes);
    }
}
