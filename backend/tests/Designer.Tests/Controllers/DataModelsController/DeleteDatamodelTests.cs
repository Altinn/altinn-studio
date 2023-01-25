using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;
using static Designer.Tests.Controllers.DataModelsController.Utils.MockUtils;

namespace Designer.Tests.Controllers.DataModelsController;

public class DeleteDatamodelTests : ApiTestsBase<DatamodelsController, DeleteDatamodelTests>
{
    private const string VersionPrefix = "/designer/api";
    private readonly Mock<IRepository> _repositoryMock;

    public DeleteDatamodelTests(WebApplicationFactory<DatamodelsController> factory) : base(factory)
    {
        _repositoryMock = new Mock<IRepository>();
        MockRepositoryCalls(_repositoryMock, TestRepositoriesLocation, "testUser");
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.Configure<ServiceRepositorySettings>(c =>
            c.RepositoryLocation = TestRepositoriesLocation);
        services.AddSingleton<IGitea, IGiteaMock>();
        services.AddSingleton(_repositoryMock.Object);
    }

    [Fact]
    public async Task Delete_Datamodel_Ok()
    {
        string dataPathWithData = $"{VersionPrefix}/ttd/ttd-datamodels/Datamodels/DeleteDatamodel?modelName=41111";

        HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, dataPathWithData);

        HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
