using System.Net;
using System.Text.Json;
using Argon;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.OpenApi;
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

    [Fact]
    public async Task Swagger_PreservesSuccessAndConflictResponsesForContentConflictOperations()
    {
        using HttpClient client = GetRootedClient("tdd", "contributer-restriction");
        using HttpResponseMessage response = await client.GetAsync("/swagger/v1/swagger.json");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using JsonDocument document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        JsonElement paths = document.RootElement.GetProperty("paths");

        AssertSuccessAndConflictResponses(
            paths
                .GetProperty("/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}")
                .GetProperty("delete")
                .GetProperty("responses"),
            "#/components/schemas/DataPostResponse"
        );
        AssertSuccessAndConflictResponses(
            paths
                .GetProperty(
                    "/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/workflow-engine-callbacks/{commandKey}"
                )
                .GetProperty("post")
                .GetProperty("responses"),
            "#/components/schemas/AppCallbackResponse"
        );
    }

    private static void AssertSuccessAndConflictResponses(JsonElement responses, string successSchema)
    {
        Assert.Equal(
            successSchema,
            responses
                .GetProperty("200")
                .GetProperty("content")
                .GetProperty("application/json")
                .GetProperty("schema")
                .GetProperty("$ref")
                .GetString()
        );
        Assert.Equal(
            "#/components/schemas/ProblemDetails",
            responses
                .GetProperty("409")
                .GetProperty("content")
                .GetProperty("application/json")
                .GetProperty("schema")
                .GetProperty("$ref")
                .GetString()
        );
    }

    private static async Task Snapshot(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);

        await using var stream = await response.Content.ReadAsStreamAsync();
        var result = await OpenApiDocument.LoadAsync(stream, format: OpenApiConstants.Json);
        // Assert.Empty(result.Diagnostic?.Errors ?? []);
        var document = result.Document ?? throw new InvalidOperationException("Failed to read OpenAPI document");
        document.Info.Version = "";
        await VerifyJson(await document.SerializeAsJsonAsync(OpenApiSpecVersion.OpenApi3_0), _verifySettings);
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
