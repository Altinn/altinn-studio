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
            "#/components/schemas/DataPostResponse",
            "application/problem+json"
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
        AssertConflictResponse(
            paths
                .GetProperty("/{org}/{app}/instances/{instanceOwnerId}/{instanceId}/data/{dataGuid}/validate")
                .GetProperty("get")
                .GetProperty("responses")
        );
        AssertActionsConflictResponse(
            paths
                .GetProperty("/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/actions")
                .GetProperty("post")
                .GetProperty("responses")
                .GetProperty("409")
        );
        AssertProblemDetailsConflictResponse(
            paths
                .GetProperty("/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data")
                .GetProperty("post")
                .GetProperty("responses"),
            "application/problem+json"
        );
        AssertProblemDetailsConflictResponse(
            paths
                .GetProperty("/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}/tags")
                .GetProperty("put")
                .GetProperty("responses"),
            "application/json",
            "application/problem+json"
        );
        AssertProblemDetailsConflictResponse(
            paths
                .GetProperty("/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/payment")
                .GetProperty("get")
                .GetProperty("responses"),
            "application/problem+json"
        );
        AssertProblemDetailsConflictResponse(
            paths
                .GetProperty("/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/complete")
                .GetProperty("post")
                .GetProperty("responses"),
            "application/json",
            "application/problem+json"
        );
        AssertProblemDetailsConflictResponse(
            paths
                .GetProperty(
                    "/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}/user-defined-metadata"
                )
                .GetProperty("put")
                .GetProperty("responses"),
            "application/json",
            "application/problem+json"
        );
        AssertProblemDetailsConflictResponse(
            paths
                .GetProperty("/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process/next")
                .GetProperty("put")
                .GetProperty("responses"),
            "application/json",
            "application/problem+json"
        );
        AssertStringOrProblemConflictResponse(
            paths
                .GetProperty("/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process/start")
                .GetProperty("post")
                .GetProperty("responses")
                .GetProperty("409")
        );
        AssertStringOrProblemConflictResponse(
            paths
                .GetProperty("/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process/completeProcess")
                .GetProperty("put")
                .GetProperty("responses")
                .GetProperty("409")
        );

        JsonElement patchOperation = paths
            .GetProperty("/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data")
            .GetProperty("patch");
        Assert.Equal(
            "#/components/schemas/ProblemDetails",
            patchOperation
                .GetProperty("responses")
                .GetProperty("412")
                .GetProperty("content")
                .GetProperty("application/json")
                .GetProperty("schema")
                .GetProperty("$ref")
                .GetString()
        );
        JsonElement patchRequestSchema = document
            .RootElement.GetProperty("components")
            .GetProperty("schemas")
            .GetProperty("DataPatchRequestMultiple");
        Assert.Equal(
            "integer",
            patchRequestSchema
                .GetProperty("properties")
                .GetProperty("expectedProcessStateVersion")
                .GetProperty("type")
                .GetString()
        );
        Assert.DoesNotContain(
            "expectedProcessStateVersion",
            document
                .RootElement.GetProperty("components")
                .GetProperty("schemas")
                .GetProperty("DataPatchRequest")
                .GetProperty("properties")
                .EnumerateObject()
                .Select(property => property.Name)
        );
    }

    private static void AssertSuccessAndConflictResponses(
        JsonElement responses,
        string successSchema,
        string conflictMediaType = "application/json"
    )
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
        AssertConflictResponse(responses, conflictMediaType);
    }

    private static void AssertConflictResponse(JsonElement responses, string mediaType = "application/json")
    {
        Assert.Equal(
            "#/components/schemas/ProblemDetails",
            responses
                .GetProperty("409")
                .GetProperty("content")
                .GetProperty(mediaType)
                .GetProperty("schema")
                .GetProperty("$ref")
                .GetString()
        );
    }

    private static void AssertProblemDetailsConflictResponse(JsonElement responses, params string[] mediaTypes)
    {
        JsonElement content = responses.GetProperty("409").GetProperty("content");
        Assert.Equal(
            mediaTypes.Order().ToArray(),
            content.EnumerateObject().Select(property => property.Name).Order().ToArray()
        );
        foreach (string mediaType in mediaTypes)
        {
            AssertSchemaReference(content.GetProperty(mediaType).GetProperty("schema"), "ProblemDetails");
        }
    }

    private static void AssertActionsConflictResponse(JsonElement conflictResponse)
    {
        JsonElement content = conflictResponse.GetProperty("content");
        Assert.Equal(
            ["application/json", "application/problem+json", "text/json", "text/plain"],
            content.EnumerateObject().Select(property => property.Name).Order().ToArray()
        );
        Assert.Equal("string", content.GetProperty("text/plain").GetProperty("schema").GetProperty("type").GetString());
        AssertSchemaReference(content.GetProperty("application/problem+json").GetProperty("schema"), "ProblemDetails");
        AssertOneOfSchemaReferences(
            content.GetProperty("application/json").GetProperty("schema"),
            "ProblemDetails",
            "UserActionResponse"
        );
        AssertOneOfSchemaReferences(
            content.GetProperty("text/json").GetProperty("schema"),
            "ProblemDetails",
            "UserActionResponse"
        );
    }

    private static void AssertStringOrProblemConflictResponse(JsonElement conflictResponse)
    {
        JsonElement content = conflictResponse.GetProperty("content");
        Assert.Equal(
            ["application/json", "application/problem+json", "text/json", "text/plain"],
            content.EnumerateObject().Select(property => property.Name).Order().ToArray()
        );
        Assert.Equal("string", content.GetProperty("text/plain").GetProperty("schema").GetProperty("type").GetString());
        AssertSchemaReference(content.GetProperty("application/problem+json").GetProperty("schema"), "ProblemDetails");
        AssertStringOrProblemSchema(content.GetProperty("application/json").GetProperty("schema"));
        AssertStringOrProblemSchema(content.GetProperty("text/json").GetProperty("schema"));
    }

    private static void AssertStringOrProblemSchema(JsonElement schema)
    {
        JsonElement[] variants = schema.GetProperty("oneOf").EnumerateArray().ToArray();
        Assert.Contains(
            variants,
            variant => variant.TryGetProperty("type", out var type) && type.GetString() == "string"
        );
        Assert.Contains(
            variants,
            variant =>
                variant.TryGetProperty("$ref", out var reference)
                && reference.GetString() == "#/components/schemas/ProblemDetails"
        );
    }

    private static void AssertOneOfSchemaReferences(JsonElement schema, params string[] expectedSchemaNames)
    {
        string[] actualSchemaNames = schema
            .GetProperty("oneOf")
            .EnumerateArray()
            .Select(reference => reference.GetProperty("$ref").GetString()!.Split('/').Last())
            .Order()
            .ToArray();
        Assert.Equal(expectedSchemaNames.Order().ToArray(), actualSchemaNames);
    }

    private static void AssertSchemaReference(JsonElement schema, string expectedSchemaName)
    {
        Assert.Equal($"#/components/schemas/{expectedSchemaName}", schema.GetProperty("$ref").GetString());
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
