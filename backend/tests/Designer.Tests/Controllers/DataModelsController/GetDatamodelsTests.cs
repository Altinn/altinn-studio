using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.DataModelsController;

public class GetDatamodelsTests : DatamodelsControllerTestsBase<GetDatamodelsTests>
{
    public GetDatamodelsTests(WebApplicationFactory<DatamodelsController> factory) : base(factory)
    {
    }

    [Theory]
    [InlineData("ttd", "hvem-er-hvem")]
    public async Task GetDatamodels_NoInput_ShouldReturnAllModels(string org, string repo)
    {
        string url = $"{VersionPrefix(org, repo)}/all-json";

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

        var response = await HttpClient.Value.SendAsync(httpRequestMessage);
        var altinnCoreFiles = await response.Content.ReadAsAsync<List<AltinnCoreFile>>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(7, altinnCoreFiles.Count);
    }
}
