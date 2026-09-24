using System;
using System.Collections.Generic;
using System.IO;
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
    [InlineData(8)]
    [InlineData(9)]
    public async Task AddDataType_DisablesLegacyPdfCreationOnlyForV8(int majorVersion)
    {
        const string org = "ttd";
        const string developer = "testUser";
        const string dataTypeId = "signatureInformation";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, "empty-app", developer, targetRepository);
        await File.WriteAllTextAsync(
            Path.Combine(TestRepoPath, "App", "App.csproj"),
            $"""
            <Project Sdk="Microsoft.NET.Sdk">
              <ItemGroup><PackageReference Include="Altinn.App.Api" Version="{majorVersion}.0.0" /></ItemGroup>
            </Project>
            """
        );
        using var content = new StringContent("[]", Encoding.UTF8, "application/json");

        using var response = await HttpClient.PostAsync(
            VersionPrefix(org, targetRepository, dataTypeId, "Task_1"),
            content
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using JsonDocument metadata = JsonDocument.Parse(
            TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/config/applicationmetadata.json")
        );
        JsonElement dataType = metadata
            .RootElement.GetProperty("dataTypes")
            .EnumerateArray()
            .Single(type => type.GetProperty("id").GetString() == dataTypeId);
        bool hasLegacyFlag = dataType.TryGetProperty("enablePdfCreation", out JsonElement legacyFlag);
        Assert.Equal(majorVersion == 8, hasLegacyFlag);
        if (hasLegacyFlag)
        {
            Assert.False(legacyFlag.GetBoolean());
        }
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
#pragma warning disable CS0618 // V8 still uses this flag
            EnablePdfCreation = false,
#pragma warning restore CS0618
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
#pragma warning disable CS0618 // V8 still uses this flag
            EnablePdfCreation = false,
#pragma warning restore CS0618
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
    public async Task AddDataTypeWithAllowedContentTypesToApplicationMetadata_ShouldRegisterGivenContentTypes()
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

        DataType expectedDataType = new()
        {
            Id = dataTypeId,
            AllowedContentTypes = allowedContentTypes.ToList(),
            MaxCount = 1,
            MinCount = 0,
            TaskId = taskId,
#pragma warning disable CS0618 // V8 still uses this flag
            EnablePdfCreation = false,
#pragma warning restore CS0618
            EnableFileScan = false,
            ValidationErrorOnPendingFileScan = false,
            EnabledFileAnalysers = new List<string>(),
            EnabledFileValidators = new List<string>(),
            AllowedContributors = allowedContributors.ToList(),
        };

        Assert.Equal(2, appMetadata.DataTypes.Count);
        AssertionUtil.AssertEqualTo(
            expectedDataType,
            appMetadata.DataTypes.Find(dataType => dataType.Id == dataTypeId)
        );
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
