using System.Net.Http.Headers;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.OpenApi;

public class OpenApiSpecChangeDetection : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    public OpenApiSpecChangeDetection(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper) : base(factory, outputHelper)
    {
    }

    [Fact]
    public async Task SaveJsonSwagger()
    {
        HttpClient client = GetRootedClient("tdd", "contributer-restriction");
        // The test project exposes swagger.json at /swagger/v1/swagger.json not /{org}/{app}/swagger/v1/swagger.json
        HttpResponseMessage response = await client.GetAsync("/swagger/v1/swagger.json");
        string openApiSpec = await response.Content.ReadAsStringAsync();
        response.EnsureSuccessStatusCode();
        var originalSpec = await File.ReadAllTextAsync("../../../OpenApi/swagger.json");
        await File.WriteAllTextAsync("../../../OpenApi/swagger.json", openApiSpec);
        openApiSpec.ReplaceLineEndings().Should().BeEquivalentTo(originalSpec.ReplaceLineEndings(), because: "The OpenAPI spec in the repo should be up do date with the code. If this test fails, update the OpenAPI spec in the repo with the new one from the code. This ensures that tests fails in CI if spec is not updated.");
    }

    [Fact]
    public async Task SaveYamlSwagger()
    {
        HttpClient client = GetRootedClient("tdd", "contributer-restriction");
        // The test project exposes swagger.json at /swagger/v1/swagger.json not /{org}/{app}/swagger/v1/swagger.json
        using var request = new HttpRequestMessage(HttpMethod.Get, "/swagger/v1/swagger.yaml");
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/yaml"));
        HttpResponseMessage response = await client.SendAsync(request);
        string openApiSpec = await response.Content.ReadAsStringAsync();
        response.EnsureSuccessStatusCode();
        var originalSpec = await File.ReadAllTextAsync("../../../OpenApi/swagger.yaml");
        await File.WriteAllTextAsync("../../../OpenApi/swagger.yaml", openApiSpec);
        openApiSpec.ReplaceLineEndings().Should().BeEquivalentTo(originalSpec.ReplaceLineEndings(), because: "The OpenAPI spec in the repo should be up do date with the code. If this test fails, update the OpenAPI spec in the repo with the new one from the code. This ensures that tests fails in CI if spec is not updated.");
    }
}