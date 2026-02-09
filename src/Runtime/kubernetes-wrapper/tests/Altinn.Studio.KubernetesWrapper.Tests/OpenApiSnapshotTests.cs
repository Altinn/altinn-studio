using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Altinn.Studio.KubernetesWrapper.Tests;

internal sealed class OpenApiSnapshotTests
{
    [Test]
    public async Task OpenApiDocument_ShouldMatchSnapshot()
    {
        await using var factory = new WebApplicationFactory<Program>();
        using var client = factory.CreateClient(
            new WebApplicationFactoryClientOptions { BaseAddress = new Uri("http://localhost") }
        );

        var uri = new Uri("/kuberneteswrapper/swagger/v1/swagger.json", UriKind.Relative);
        using var response = await client.GetAsync(uri);
        response.EnsureSuccessStatusCode();

        var openApiJson = await response.Content.ReadAsStringAsync();
        ArgumentException.ThrowIfNullOrWhiteSpace(openApiJson);

        _ = JsonDocument.Parse(openApiJson);

        await Verifier.VerifyJson(openApiJson);
    }
}
