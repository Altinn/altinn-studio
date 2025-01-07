using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ContactController;

public class GetBelongsToOrgTests : DesignerEndpointsTestsBase<GetBelongsToOrgTests>,
    IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = $"/designer/api/belongs-to-org";
    private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/config";

    public GetBelongsToOrgTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Theory]
    public async Task GetBelongsToOrg()
    {
        string dataPathWithData = VersionPrefix(org, app);
        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        response.EnsureSuccessStatusCode();
        ServiceConfiguration serviceConfigResponse = await response.Content.ReadAsAsync<ServiceConfiguration>();
        ServiceConfiguration serviceConfiguration = new ServiceConfiguration { RepositoryName = app, ServiceDescription = null, ServiceId = null, ServiceName = null };

        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equal(serviceConfiguration.RepositoryName, serviceConfigResponse.RepositoryName);
    }

}
