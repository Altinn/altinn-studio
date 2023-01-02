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

public class UseXsdFromRepoTests : ApiTestsBase<DatamodelsController, AddXsdTests>
{
    private const string VersionPrefix = "/designer/api";

    public UseXsdFromRepoTests(WebApplicationFactory<DatamodelsController> factory) : base(factory)
    {
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.Configure<ServiceRepositorySettings>(c =>
            c.RepositoryLocation = TestRepositoriesLocation);
        services.AddSingleton<IGitea, IGiteaMock>();
    }

    [Fact]
    public async Task UseXsdFromRepo_DatamodelsRepo_ShouldReturnCreated()
    {
        // Arrange
        var org = "ttd";
        var sourceRepository = "ttd-datamodels";
        var developer = "testUser";
        var targetRepository = TestDataHelper.GenerateTestRepoName();

        await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
        string filePath = "/App/models/41111.xsd";
        var url = $"{VersionPrefix}/{org}/{targetRepository}/datamodels/xsd-from-repo?filePath={filePath}";

        var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, url);

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
