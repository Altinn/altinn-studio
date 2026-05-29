using System.Net;
using Altinn.App.Api.Controllers;
using Argon;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.OpenApi.Extensions;
using Microsoft.OpenApi.Models;
using Microsoft.OpenApi.Readers;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.OpenApi;

public class OpenApiSpecChangeDetection : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    public OpenApiSpecChangeDetection(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper) { }

    [Fact]
    public async Task SaveJsonSwagger()
    {
        using HttpClient client = GetRootedClient("tdd", "contributer-restriction");
        // The test project exposes swagger.json at /swagger/v1/swagger.json not /{org}/{app}/swagger/v1/swagger.json
        using HttpResponseMessage response = await client.GetAsync("/swagger/v1/swagger.json");
        await Snapshot(response);
    }

    [Fact]
    public async Task SaveCustomOpenApiSpec()
    {
        var org = "tdd";
        var app = "contributer-restriction";
        using HttpClient client = GetRootedClient(org, app);
        // The test project exposes swagger.json at /swagger/v1/swagger.json not /{org}/{app}/swagger/v1/swagger.json
        using HttpResponseMessage response = await client.GetAsync($"/{org}/{app}/v1/customOpenapi.json");
        await Snapshot(response);
    }

    private static async Task Snapshot(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);

        await using var stream = await response.Content.ReadAsStreamAsync();
        var reader = new OpenApiStreamReader();
        OpenApiDocument document = reader.Read(stream, out OpenApiDiagnostic diagnostic);
        // Assert.Empty(diagnostic.Errors);
        document.Info.Version = "";
        await VerifyJson(
            document.Serialize(CustomOpenApiController.SpecVersion, CustomOpenApiController.SpecFormat),
            _verifySettings
        );
    }

    private static VerifySettings _verifySettings
    {
        get
        {
            VerifySettings settings = new();
            settings.UseStrictJson();
            settings.DontScrubGuids();
            settings.DontIgnoreEmptyCollections();
            settings.AddExtraSettings(settings => settings.MetadataPropertyHandling = MetadataPropertyHandling.Ignore);
            return settings;
        }
    }
}
