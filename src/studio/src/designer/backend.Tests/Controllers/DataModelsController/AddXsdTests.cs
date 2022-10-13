using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Designer.Tests.Controllers.DataModelsController;

public class AddXsdTests : ApiTestsBase<DatamodelsController, AddXsdTests>
{
    private const string VersionPrefix = "/designer/api";

    public AddXsdTests(WebApplicationFactory<DatamodelsController> factory) : base(factory)
    {
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.Configure<ServiceRepositorySettings>(c =>
            c.RepositoryLocation = TestRepositoriesLocation);
        services.AddSingleton<IGitea, IGiteaMock>();
    }

    [Fact]
    public async Task AddXsd_AppRepo_PreferredXsd_ShouldReturnCreated()
    {
        // Arrange
        var org = "ttd";
        var sourceRepository = "empty-app";
        var developer = "testUser";
        var targetRepository = Guid.NewGuid().ToString();

        await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
        var url = $"{VersionPrefix}/{org}/{targetRepository}/datamodels/upload";

        var fileStream = TestDataHelper.LoadDataFromEmbeddedResource(
            "Designer.Tests._TestData.Model.Xsd.Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.xsd");
        var formData = new MultipartFormDataContent();
        var streamContent = new StreamContent(fileStream);
        streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse("multipart/form-data");
        formData.Add(streamContent, "file", "Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.xsd");

        var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = formData
        };

        try
        {
            var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }
        finally
        {
            TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
        }
    }

    [Fact]
    public async Task AddXsd_AppRepo_PreferredJson_ShouldReturnCreated()
    {
        // Arrange
        var org = "ttd";
        var sourceRepository = "empty-app-pref-json";
        var developer = "testUser";
        var targetRepository = Guid.NewGuid().ToString();

        await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
        var url = $"{VersionPrefix}/{org}/{targetRepository}/datamodels/upload";

        var fileStream = TestDataHelper.LoadDataFromEmbeddedResource(
            "Designer.Tests._TestData.Model.Xsd.Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.xsd");
        var formData = new MultipartFormDataContent();
        var streamContent = new StreamContent(fileStream);
        streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse("multipart/form-data");
        formData.Add(streamContent, "file", "Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.xsd");

        var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = formData
        };

        try
        {
            var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }
        finally
        {
            TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
        }
    }

    [Fact]
    public async Task AddXsd_DatamodelsRepo_ShouldReturnCreated()
    {
        // Arrange
        var org = "ttd";
        var sourceRepository = "empty-datamodels";
        var developer = "testUser";
        var targetRepository = Guid.NewGuid().ToString();

        await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
        var url = $"{VersionPrefix}/{org}/{targetRepository}/datamodels/upload";

        var fileStream = TestDataHelper.LoadDataFromEmbeddedResource(
            "Designer.Tests._TestData.Model.Xsd.Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.xsd");
        var formData = new MultipartFormDataContent();
        var streamContent = new StreamContent(fileStream);
        streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse("multipart/form-data");
        formData.Add(streamContent, "file", "Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.xsd");

        var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = formData
        };

        try
        {
            var response = await HttpClient.Value.SendAsync(httpRequestMessage);
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }
        finally
        {
            TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
        }
    }
}
