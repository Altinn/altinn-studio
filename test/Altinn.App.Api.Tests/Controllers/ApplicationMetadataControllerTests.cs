using System.Text.Json;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using FluentAssertions;
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
        var application = JsonSerializer.Deserialize<ApplicationMetadata>(appMetadataSample, _jsonSerializerOptions)!;
        _appMetadataMock.Setup(m => m.GetApplicationMetadata()).ReturnsAsync(application);
        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton(_appMetadataMock.Object);
        };
        var client = GetRootedClient(org, appId);

        var response = await client.GetStringAsync($"/{org}/{appId}/api/v1/applicationmetadata");

        // Assert that unknown parts of json is preserved
        response.Should().ContainAll("extra_Unknown_list", "verdi\":3");
    }
}
