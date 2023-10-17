using System.Text.Json;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Altinn.App.Api.Tests.Constants;

public class ApplicationMetadataControllerTests
{
    private readonly WebApplicationFactory<Program> _factory = new();
    private readonly Mock<IAppMetadata> _appMetadataMock = new();

    [Fact]
    public async Task VeryfyExtraFieldsInApplicationMetadataIsPreserved()
    {
        var org = "tdd";
        var appId = "test-app";
        var appMetadataSample = $"{{\"id\":\"{org}/{appId}\",\"org\":\"{org}\",\"title\":{{\"nb\":\"Bestillingseksempelapp\"}},\"dataTypes\":[],\"partyTypesAllowed\":{{}},\"extra_Unknown_list\":[3,\"tre\",{{\"verdi\":3}}]}}";
        var application = JsonSerializer.Deserialize<ApplicationMetadata>(appMetadataSample, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
        _appMetadataMock.Setup(m => m.GetApplicationMetadata()).ReturnsAsync(application);
        using var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                services.AddTransient<IAppMetadata>(sp => _appMetadataMock.Object);
            });
        }).CreateClient();

        var response = await client.GetStringAsync($"/{org}/{appId}/api/v1/applicationmetadata");

        // Assert that unknonwn parts of json is preserved
        response.Should().ContainAll("extra_Unknown_list", "verdi\":3");
    }
}