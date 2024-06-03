using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.App.Core.Models;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.DataModelsController;

public class DeleteDatamodelTests : DisagnerEndpointsTestsBase<DeleteDatamodelTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/datamodels";
    private readonly Mock<IRepository> _repositoryMock;

    public DeleteDatamodelTests(WebApplicationFactory<Program> factory) : base(factory)
    {
        _repositoryMock = new Mock<IRepository>();
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.Configure<ServiceRepositorySettings>(c =>
            c.RepositoryLocation = TestRepositoriesLocation);
        services.AddSingleton<IGitea, IGiteaMock>();
        services.AddSingleton(_repositoryMock.Object);
    }

    [Theory]
    [InlineData("ttd", "ttd-datamodels", "/App/models/41111.schema.json")]
    public async Task Delete_Datamodel_FromDataModelRepo_Ok(string org, string repo, string modelPath)
    {
        string dataPathWithData = $"{VersionPrefix(org, repo)}/datamodel?modelPath={modelPath}";

        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, dataPathWithData);

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Theory]
    [InlineData("ttd", "app-with-layoutsets", "testUser", "/App/models/datamodel.schema.json")]
    public async Task Delete_Datamodel_FromAppWhereDataModelHasMultipleLayoutSetConnections_Ok(string org, string repo, string developer, string modelPath)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, repo, developer, targetRepository);
        string dataPathWithData = $"{VersionPrefix(org, targetRepository)}/datamodel?modelPath={modelPath}";
        string applicationMetadataFromRepoBefore = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/config/applicationmetadata.json");
        string layoutSetsFromRepoBefore = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/ui/layout-sets.json");
        applicationMetadataFromRepoBefore.Should().Contain("datamodel");
        LayoutSets layoutSets = JsonSerializer.Deserialize<LayoutSets>(layoutSetsFromRepoBefore, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        layoutSets.Sets.FindAll(set => set.DataType == "datamodel").Count.Should().Be(2);

        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, dataPathWithData);

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        string applicationMetadataFromRepoAfter = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/config/applicationmetadata.json");
        string layoutSetsFromRepoAfter = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/ui/layout-sets.json");
        applicationMetadataFromRepoAfter.Should().NotContain("datamodel");
        layoutSetsFromRepoAfter.Should().NotContain("datamodel");
    }
}
