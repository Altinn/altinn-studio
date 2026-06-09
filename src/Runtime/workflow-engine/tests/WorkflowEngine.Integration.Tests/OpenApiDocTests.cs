using System.Net;
using System.Text.Json;
using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// Contract tests for the generated OpenAPI document — guards the metadata the built-in generator
/// cannot infer and that we inject via transformers (status enum values, technical-guide links).
/// </summary>
[Collection(EngineAppCollection.Name)]
public class OpenApiDocTests(EngineAppFixture<Program> fixture)
{
    [Fact]
    public async Task StatusFilter_ExposesEnumValuesAndDescription()
    {
        using var client = fixture.CreateEngineClient();
        using var doc = await GetOpenApiDoc(client);

        var statusParam = doc
            .RootElement.GetProperty("paths")
            .GetProperty("/api/v1/{namespace}/workflows")
            .GetProperty("get")
            .GetProperty("parameters")
            .EnumerateArray()
            .Single(p => p.GetProperty("name").GetString() == "status");

        var enumValues = statusParam
            .GetProperty("schema")
            .GetProperty("items")
            .GetProperty("enum")
            .EnumerateArray()
            .Select(e => e.GetString())
            .ToList();

        foreach (var name in Enum.GetNames<PersistentItemStatus>())
            Assert.Contains(name, enumValues);

        Assert.False(string.IsNullOrWhiteSpace(statusParam.GetProperty("description").GetString()));
    }

    [Fact]
    public async Task LinksToTechnicalGuide_AtDocumentAndOperationLevel()
    {
        using var client = fixture.CreateEngineClient();
        using var doc = await GetOpenApiDoc(client);

        var documentUrl = doc.RootElement.GetProperty("externalDocs").GetProperty("url").GetString();
        Assert.Contains("technical-guide.md", documentUrl);

        var cancelUrl = FindPath(doc, "/cancel")
            .GetProperty("post")
            .GetProperty("externalDocs")
            .GetProperty("url")
            .GetString();
        Assert.Contains("#immediate-vs-distributed-cancellation", cancelUrl);
    }

    private static JsonElement FindPath(JsonDocument doc, string suffix)
    {
        foreach (var path in doc.RootElement.GetProperty("paths").EnumerateObject())
        {
            if (path.Name.EndsWith(suffix, StringComparison.Ordinal))
                return path.Value;
        }

        throw new InvalidOperationException($"No path ending in '{suffix}' found in the OpenAPI document.");
    }

    private static async Task<JsonDocument> GetOpenApiDoc(HttpClient client)
    {
        using var response = await client.GetAsync("/openapi/v1.json", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        return JsonDocument.Parse(json);
    }
}
