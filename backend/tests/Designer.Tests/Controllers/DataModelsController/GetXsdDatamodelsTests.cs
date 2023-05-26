using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.DataModelsController;

public class GetXsdDatamodelsTests : DatamodelsControllerTestsBase<GetXsdDatamodelsTests>
{
    public GetXsdDatamodelsTests(WebApplicationFactory<DatamodelsController> factory) : base(factory)
    {
    }

    [Theory]
    [InlineData("ttd", "hvem-er-hvem")]
    public async Task GetXsdDatamodels_NoInput_ShouldReturnAllModels(string org, string repo)
    {
        string url = $"{VersionPrefix(org, repo)}/all-xsd";

        var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

        var response = await HttpClient.Value.SendAsync(httpRequestMessage);
        var altinnCoreFiles = await response.Content.ReadAsAsync<List<AltinnCoreFile>>();

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        altinnCoreFiles.Count.Should().Be(2);
    }
}
