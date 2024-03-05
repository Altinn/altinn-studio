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
        _outputHelper.WriteLine(openApiSpec);
        response.EnsureSuccessStatusCode();
        await File.WriteAllTextAsync("../../../OpenApi/swagger.json", openApiSpec);
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
        _outputHelper.WriteLine(openApiSpec);
        response.EnsureSuccessStatusCode();
        await File.WriteAllTextAsync("../../../OpenApi/swagger.yaml", openApiSpec);
    }
}