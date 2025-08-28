using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.DataModelsController;

public class GetDatamodelsTests : DesignerEndpointsTestsBase<GetDatamodelsTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/datamodels";
    public GetDatamodelsTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Theory]
    [InlineData("ttd", "hvem-er-hvem")]
    public async Task GetDatamodels_NoInput_ShouldReturnAllModels(string org, string repo)
    {
        string url = $"{VersionPrefix(org, repo)}/json";

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

        var response = await HttpClient.SendAsync(httpRequestMessage);
        var altinnCoreFiles = await response.Content.ReadAsAsync<List<AltinnCoreFile>>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(7, altinnCoreFiles.Count);
    }
}
