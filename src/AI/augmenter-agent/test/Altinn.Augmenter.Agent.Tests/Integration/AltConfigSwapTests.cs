using System.Net;
using System.Text;
using System.Text.Json;
using Altinn.Augmenter.Agent.Tests.Integration.Helpers;
using FluentAssertions;

namespace Altinn.Augmenter.Agent.Tests.Integration;

/// <summary>
/// Boots the app with examples/alt-config/ in place of config/ and exercises
/// /generate against a sample permisjonssoknad. If the image has hidden
/// coupling to bevillinger-specific field names, registry keys, or pipeline
/// shape, this test fails — either at startup (ConfigValidator throws),
/// during the mapping step (JsonPathMapper can't resolve), or at the
/// orchestrator step (aggregator/template mismatch).
///
/// The class fixture (and Skip below) means this test only runs when Typst
/// is available — the alt-config templates need real PDF rendering to verify
/// the wire shape end-to-end.
/// </summary>
public sealed class AltConfigSwapTests(AltConfigWebApplicationFactory factory)
    : IClassFixture<AltConfigWebApplicationFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task PostGenerate_AgainstAltConfig_ReturnsBothPdfsWithCorrectShape()
    {
        if (TypstLocator.FindTypst() == null)
            return; // Typst not on PATH — same skip semantics as other Typst-dependent tests.

        var samplePath = AltConfigLocator.GetSampleApplicationPath();
        var sampleBytes = await File.ReadAllBytesAsync(samplePath);

        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(sampleBytes);
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");
        content.Add(fileContent, "file", "permisjonssoknad.json");

        var response = await _client.PostAsync("/generate", content);

        response.StatusCode.Should().Be(
            HttpStatusCode.OK,
            because: "alt-config pipeline should drive end-to-end with the canned chat stub — " +
                     "a failure here means hidden coupling between image and config/");

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);

        var pdfs = doc.RootElement.GetProperty("pdfs").EnumerateArray().ToList();

        // alt-config pipeline.yaml defines exactly two steps, in this order.
        pdfs.Should().HaveCount(2, because: "alt-config pipeline.yaml defines two steps");

        var names = pdfs.Select(p => p.GetProperty("name").GetString()).ToList();
        names.Should().Contain("permisjonssoknad.pdf");
        names.Should().Contain("vurdering.pdf");

        // Sanity-check each PDF actually has the magic header.
        foreach (var pdf in pdfs)
        {
            var bytes = Convert.FromBase64String(pdf.GetProperty("data").GetString()!);
            bytes.Should().NotBeEmpty();
            Encoding.ASCII.GetString(bytes, 0, 5).Should().Be("%PDF-");
        }
    }
}
