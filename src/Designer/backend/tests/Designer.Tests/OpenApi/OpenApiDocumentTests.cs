using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.OpenApi;

public class OpenApiDocumentTests
    : DesignerEndpointsTestsBase<OpenApiDocumentTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    public OpenApiDocumentTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    [Fact]
    public async Task OpenApiDocument_IsGeneratedForEveryController()
    {
        using HttpResponseMessage response = await HttpClient.GetAsync("designer/openapi/v1/openapi.json");
        string responseBody = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using JsonDocument document = JsonDocument.Parse(responseBody);
        Assert.True(document.RootElement.GetProperty("paths").TryGetProperty("/designer/api/apptemplates", out _));
    }
}
