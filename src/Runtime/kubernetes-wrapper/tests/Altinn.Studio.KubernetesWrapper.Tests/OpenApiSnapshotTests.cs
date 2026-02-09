using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using VerifyTests;

namespace Altinn.Studio.KubernetesWrapper.Tests;

public class OpenApiSnapshotTests
{
    [Test]
    public async Task OpenApiDocument_ShouldMatchSnapshot()
    {
        await using var factory = new WebApplicationFactory<Program>();
        using var client = factory.CreateClient(
            new WebApplicationFactoryClientOptions { BaseAddress = new Uri("http://localhost") }
        );

        using var response = await client.GetAsync("/kuberneteswrapper/swagger/v1/swagger.json");
        response.EnsureSuccessStatusCode();

        var openApiJson = await response.Content.ReadAsStringAsync();
        ArgumentException.ThrowIfNullOrWhiteSpace(openApiJson);

        _ = JsonDocument.Parse(openApiJson);

        await Verifier.VerifyJson(openApiJson);
    }
}
