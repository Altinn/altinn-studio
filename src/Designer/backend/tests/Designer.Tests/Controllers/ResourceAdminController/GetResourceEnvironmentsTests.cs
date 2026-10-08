using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ResourceAdminController;

public class GetResourceEnvironmentsTests
    : ResourceAdminControllerTestsBaseClass<GetResourceEnvironmentsTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    public GetResourceEnvironmentsTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    [Theory]
    [InlineData("ttd", new[] { "tt02", "prod", "yt01", "at22", "at23", "at24" })]
    [InlineData("nav", new[] { "tt02", "prod" })]
    public async Task GetResourceEnvironments_ReturnsEnvironmentsForOrg(string org, string[] expected)
    {
        // Arrange
        string uri = $"{VersionPrefix}/{org}/resources/environments";
        using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

        // Act
        using HttpResponseMessage res = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        List<string> environments = await res.Content.ReadFromJsonAsync<List<string>>();
        Assert.Equal(expected, environments);
    }
}
