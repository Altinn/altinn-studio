using Microsoft.AspNetCore.Mvc.Testing;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.OpenApi;

public class OpenApiSpecChangeDetection : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    public OpenApiSpecChangeDetection(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper) { }

    [Fact]
    public async Task SaveJsonSwagger()
    {
        HttpClient client = GetRootedClient("tdd", "contributer-restriction");
        // The test project exposes swagger.json at /swagger/v1/swagger.json not /{org}/{app}/swagger/v1/swagger.json
        HttpResponseMessage response = await client.GetAsync("/swagger/v1/swagger.json");
        string openApiSpec = await response.Content.ReadAsStringAsync();
        response.EnsureSuccessStatusCode();
        await File.WriteAllTextAsync("../../../OpenApi/swagger.json", openApiSpec);
        await VerifyJson(openApiSpec);
    }
}
