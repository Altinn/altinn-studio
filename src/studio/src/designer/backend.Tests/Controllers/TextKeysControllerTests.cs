using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Designer.Tests.Services;

public class TextKeysControllerTests : ApiTestsBase<TextKeysController, TextKeysControllerTests>
{
    private readonly string _versionPrefix = "designer/api/v1";

    public TextKeysControllerTests(WebApplicationFactory<TextKeysController> factory) : base(factory)
    {
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.Configure<ServiceRepositorySettings>(c =>
            c.RepositoryLocation = TestRepositoriesLocation);
        services.AddSingleton<IGitea, IGiteaMock>();
    }

    [Fact]
    public async Task Get_Markdown_200Ok()
    {
        var targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest("ttd", "markdown-files", "testUser", targetRepository);
        string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/texts/nb";
        HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

        HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);

        try
        {
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        }
        finally
        {
            TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
        }
    }
}
