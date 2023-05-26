using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Controllers;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.DataModelsController;

public class GetTests : DatamodelsControllerTestsBase<GetTests>
{
    public GetTests(WebApplicationFactory<DatamodelsController> factory) : base(factory)
    {
    }

    [Theory]
    [InlineData("App/models/HvemErHvem_SERES.schema.json", "ttd", "hvem-er-hvem")]
    [InlineData("App%2Fmodels%2FHvemErHvem_SERES.schema.json", "ttd", "hvem-er-hvem")]
    public async Task GetDatamodel_ValidPath_ShouldReturnContent(string modelPath, string org, string repo)
    {
        string url = $"{VersionPrefix(org, repo)}/datamodel?modelPath={modelPath}";
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

        using var response = await HttpClient.Value.SendAsync(httpRequestMessage);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
