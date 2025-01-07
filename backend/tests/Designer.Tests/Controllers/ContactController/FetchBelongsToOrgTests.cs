using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Designer.Tests.Controllers.ContactController;

public class FetchBelongsToOrgTests : DesignerEndpointsTestsBase<FetchBelongsToOrgTests>,
    IClassFixture<WebApplicationFactory<Program>>
{
    public FetchBelongsToOrgTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.Configure<ServiceRepositorySettings>(c =>
            c.RepositoryLocation = TestRepositoriesLocation);
        services.AddSingleton<IGitea, IGiteaMock>();
    }


    [Fact]
    public async Task UsersThatBelongsToOrg_ShouldReturn_True()
    {
        string url = "/designer/api/contact/belongs-to-org";

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

        var response = await HttpClient.SendAsync(httpRequestMessage);
        var responseContent = await response.Content.ReadAsAsync<BelongsToOrgDto>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(responseContent.BelongsToOrg);
    }
}
