using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
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
        Assert.Contains("technical-guide.md", documentUrl, StringComparison.Ordinal);

        var cancelUrl = FindPath(doc, "/cancel")
            .GetProperty("post")
            .GetProperty("externalDocs")
            .GetProperty("url")
            .GetString();
        Assert.Contains("#immediate-vs-distributed-cancellation", cancelUrl, StringComparison.Ordinal);
    }

    [Fact]
    public async Task EveryOperation_LinksToTechnicalGuide()
    {
        using var client = fixture.CreateEngineClient();
        using var doc = await GetOpenApiDoc(client);

        var missing = new List<string>();
        foreach (var path in doc.RootElement.GetProperty("paths").EnumerateObject())
        {
            foreach (var operation in path.Value.EnumerateObject())
            {
                if (!_httpMethods.Contains(operation.Name))
                    continue;

                var linked =
                    operation.Value.TryGetProperty("externalDocs", out var externalDocs)
                    && externalDocs.TryGetProperty("url", out var url)
                    && (url.GetString()?.Contains("technical-guide.md", StringComparison.Ordinal) ?? false);

                if (!linked)
                    missing.Add($"{operation.Name.ToUpperInvariant()} {path.Name}");
            }
        }

        Assert.True(missing.Count == 0, $"Operations missing a technical-guide link: {string.Join(", ", missing)}");
    }

    [Fact]
    public async Task EveryTechnicalGuideLink_ResolvesToARealHeading()
    {
        // The sibling test above proves a link exists, never that it points anywhere. A renamed
        // endpoint whose anchor is updated to track the new route name rather than the heading it
        // addresses therefore ships a dead fragment with CI green — which is exactly how
        // trip-throttle and clear-throttle reached main pointing at nothing.
        using var client = fixture.CreateEngineClient();
        using var doc = await GetOpenApiDoc(client);

        var headings = ReadGuideHeadingSlugs();
        Assert.NotEmpty(headings);

        var dead = new List<string>();
        foreach (var path in doc.RootElement.GetProperty("paths").EnumerateObject())
        {
            foreach (var operation in path.Value.EnumerateObject())
            {
                if (!_httpMethods.Contains(operation.Name))
                    continue;

                var url = operation.Value.GetProperty("externalDocs").GetProperty("url").GetString()!;
                var hash = url.IndexOf('#', StringComparison.Ordinal);
                if (hash < 0)
                    continue; // links to the guide as a whole

                var fragment = url[(hash + 1)..];
                if (!headings.Contains(fragment))
                    dead.Add($"{operation.Name.ToUpperInvariant()} {path.Name} -> #{fragment}");
            }
        }

        Assert.True(dead.Count == 0, $"technical-guide links with no matching heading: {string.Join(", ", dead)}");
    }

    /// <summary>
    /// Every <c>##</c>-and-deeper heading in the technical guide, slugified the way GitHub renders
    /// anchors: punctuation dropped, spaces to hyphens, matched case-insensitively.
    /// </summary>
    private static HashSet<string> ReadGuideHeadingSlugs()
    {
        var guidePath = Path.GetFullPath(
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "docs", "technical-guide.md")
        );
        Assert.True(File.Exists(guidePath), $"Could not find the technical guide at {guidePath}");

        // Compared case-insensitively rather than lowercased: the anchors are lowercase, but
        // normalising by casing down trips CA1308.
        var slugs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var line in File.ReadLines(guidePath))
        {
            var match = Regex.Match(line, @"^#{2,6}\s+(.*)$");
            if (!match.Success)
                continue;

            var slug = Regex.Replace(match.Groups[1].Value.Trim(), @"[^\w\s-]", "");
            slugs.Add(Regex.Replace(slug, @"\s+", "-"));
        }
        return slugs;
    }

    private static readonly HashSet<string> _httpMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        "get",
        "post",
        "put",
        "patch",
        "delete",
        "options",
        "head",
    };

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
