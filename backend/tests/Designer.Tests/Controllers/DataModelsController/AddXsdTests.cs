using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Controllers;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.DataModelsController;

public class AddXsdTests : DatamodelsControllerTestsBase<AddXsdTests>
{
    public AddXsdTests(WebApplicationFactory<DatamodelsController> factory) : base(factory)
    {
    }

    [Theory]
    [InlineData("ttd", "empty-app", "testUser")]
    public async Task AddXsd_AppRepo_PreferredXsd_ShouldReturnCreated(string org, string sourceRepository, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
        string url = $"{VersionPrefix(org, targetRepository)}/upload";

        var fileStream = SharedResourcesHelper.LoadTestData(
            "Seres/Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.xsd");
        var formData = new MultipartFormDataContent();
        var streamContent = new StreamContent(fileStream);
        streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse("multipart/form-data");
        formData.Add(streamContent, "file", "Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.xsd");

        var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = formData
        };

        var response = await HttpClient.Value.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Theory]
    [InlineData("ttd", "empty-app-pref-json", "testUser")]
    public async Task AddXsd_AppRepo_PreferredJson_ShouldReturnCreated(string org, string sourceRepository, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
        string url = $"{VersionPrefix(org, targetRepository)}/upload";

        var fileStream = SharedResourcesHelper.LoadTestData(
            "Seres/Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.xsd");
        var formData = new MultipartFormDataContent();
        var streamContent = new StreamContent(fileStream);
        streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse("multipart/form-data");
        formData.Add(streamContent, "file", "Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.xsd");

        var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = formData
        };

        var response = await HttpClient.Value.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Theory]
    [InlineData("ttd", "empty-datamodels", "testUser")]
    public async Task AddXsd_DatamodelsRepo_NonAsciiName_ShouldReturnCreated(string org, string sourceRepository, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
        string url = $"{VersionPrefix(org, targetRepository)}/upload";

        var fileStream = SharedResourcesHelper.LoadTestData(
            "Seres/Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.xsd");
        var formData = new MultipartFormDataContent();
        var streamContent = new StreamContent(fileStream);
        streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse("multipart/form-data");
        formData.Add(streamContent, "file", "Kursdomene_HvemErHvem_M_ÅåØøæÆ.xsd");

        var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = formData
        };

        var response = await HttpClient.Value.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }
}
