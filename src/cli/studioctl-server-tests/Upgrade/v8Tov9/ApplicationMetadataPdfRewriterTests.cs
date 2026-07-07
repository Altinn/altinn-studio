using System.Text.Json;
using Altinn.Studio.Cli.Upgrade.v8Tov9.PdfServiceTaskMigration;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class ApplicationMetadataPdfRewriterTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private async Task<(ApplicationMetadataPdfRewriter Rewriter, string After)> Strip(string json)
    {
        var file = _app.Write("config/applicationmetadata.json", json);
        var rewriter = new ApplicationMetadataPdfRewriter(file);
        await rewriter.StripEnablePdfCreation();
        return (rewriter, _app.Read("config/applicationmetadata.json"));
    }

    [Fact]
    public async Task LastPropertyInObject_CommaOnPreviousLineIsRemoved()
    {
        // Raw string literals inherit the source file's line endings (CRLF on Windows checkouts),
        // so normalize to LF to match the "\n" assertion below on every platform.
        var json = """
            {
              "dataTypes": [
                {
                  "id": "model",
                  "enablePdfCreation": true
                }
              ]
            }
            """.ReplaceLineEndings("\n");

        var (_, after) = await Strip(json);

        Assert.DoesNotContain("enablePdfCreation", after, StringComparison.Ordinal);
        using var _ = JsonDocument.Parse(after); // still valid JSON
        Assert.Contains("\"id\": \"model\"\n", after, StringComparison.Ordinal);
    }

    [Fact]
    public async Task CrlfFile_CommaRemovalPreservesLineEndings()
    {
        var json = "{\r\n  \"id\": \"ttd/myapp\",\r\n  \"enablePdfCreation\": true\r\n}\r\n";

        var (_, after) = await Strip(json);

        Assert.DoesNotContain("enablePdfCreation", after, StringComparison.Ordinal);
        Assert.Contains("\"id\": \"ttd/myapp\"\r\n", after, StringComparison.Ordinal);
        using var _ = JsonDocument.Parse(after);
    }

    [Fact]
    public async Task LineWithOtherContent_IsLeftInPlaceWithWarning()
    {
        // Compact formatting: removing the whole line would take "maxCount" with it, so the property
        // must be left for manual removal.
        var json = """
            {
              "dataTypes": [
                { "id": "model", "enablePdfCreation": true, "maxCount": 1 }
              ]
            }
            """;

        var (rewriter, after) = await Strip(json);

        Assert.Contains("enablePdfCreation", after, StringComparison.Ordinal);
        Assert.Contains("maxCount", after, StringComparison.Ordinal);
        Assert.Contains(rewriter.GetWarnings(), w => w.Contains("unexpected formatting", StringComparison.Ordinal));
    }

    [Fact]
    public async Task PropertyInsideStringValue_IsNotStripped()
    {
        var json = """
            {
              "title": { "nb": "\"enablePdfCreation\": true" },
              "enablePdfCreation": false
            }
            """;

        var (_, after) = await Strip(json);

        Assert.Contains("\"nb\": \"\\\"enablePdfCreation\\\": true\"", after, StringComparison.Ordinal);
        Assert.DoesNotContain("\"enablePdfCreation\": false", after, StringComparison.Ordinal);
        using var _ = JsonDocument.Parse(after);
    }

    [Fact]
    public async Task FileWithoutTheFlag_IsUntouched()
    {
        var json = """
            {
              "id": "ttd/myapp"
            }
            """;

        var (rewriter, after) = await Strip(json);

        Assert.Equal(json, after);
        Assert.Empty(rewriter.GetWarnings());
    }

    [Fact]
    public async Task BomIsPreservedThroughStrip_AndAbsenceStaysAbsent()
    {
        var json = "{\n  \"id\": \"ttd/myapp\",\n  \"enablePdfCreation\": true\n}\n";
        var file = _app.WriteBytes(
            "config/applicationmetadata.json",
            [0xEF, 0xBB, 0xBF, .. System.Text.Encoding.UTF8.GetBytes(json)]
        );

        await new ApplicationMetadataPdfRewriter(file).StripEnablePdfCreation();

        Assert.True(
            _app.ReadBytes("config/applicationmetadata.json") is [0xEF, 0xBB, 0xBF, ..],
            "expected the UTF-8 BOM to be preserved"
        );
        Assert.DoesNotContain(
            "enablePdfCreation",
            _app.Read("config/applicationmetadata.json"),
            StringComparison.Ordinal
        );

        // And the inverse: a BOM-less file must not gain one.
        using var second = new TempAppFolder();
        var secondFile = second.Write("config/applicationmetadata.json", json);

        await new ApplicationMetadataPdfRewriter(secondFile).StripEnablePdfCreation();

        Assert.False(
            second.ReadBytes("config/applicationmetadata.json") is [0xEF, 0xBB, 0xBF, ..],
            "expected no UTF-8 BOM to be introduced"
        );
    }
}
