using System.Text.Json;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class ApplicationMetadataControllerTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IAppMetadata> _appMetadataMock = new();

    public ApplicationMetadataControllerTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper) { }

    [Fact]
    public async Task VeryfyExtraFieldsInApplicationMetadataIsPreserved()
    {
        var org = "tdd";
        var appId = "contributer-restriction";
        var appMetadataSample =
            $"{{\"id\":\"{org}/{appId}\",\"org\":\"{org}\",\"title\":{{\"nb\":\"Bestillingseksempelapp\"}},\"dataTypes\":[],\"partyTypesAllowed\":{{}},\"extra_Unknown_list\":[3,\"tre\",{{\"verdi\":3}}]}}";
        var application = JsonSerializer.Deserialize<ApplicationMetadata>(appMetadataSample, JsonSerializerOptions)!;
        _appMetadataMock.Setup(m => m.GetApplicationMetadata()).ReturnsAsync(application);
        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton(_appMetadataMock.Object);
        };
        var client = GetRootedClient(org, appId);

        using var response = await client.GetAsync($"/{org}/{appId}/api/v1/applicationmetadata");
        var responseString = await response.Content.ReadAsStringAsync();
        // Assert that unknown parts of json is preserved
        Assert.Contains("extra_Unknown_list", responseString);
        Assert.Contains("verdi\":3", responseString);

        // Verify that [ResponseCache] attribute is not overridden by midleware
        Assert.NotNull(response.Headers.CacheControl);
        var cacheControl = response.Headers.GetValues("Cache-Control").ToArray();
        Assert.Single(cacheControl);
        Assert.Equal("public, max-age=60", cacheControl[0]);
    }
}
