using System.Net;
using System.Text;
using System.Text.Json;
using Altinn.Augmenter.Agent.Tests.Integration.Helpers;
using FluentAssertions;

namespace Altinn.Augmenter.Agent.Tests.Integration;

public class GenerateTests(TestWebApplicationFactory factory) : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    private static readonly string TestApplicationJson = """
        {
            "FlatData": {
                "BevillingsType": "arrangement",
                "Arrangement": {
                    "Navn": "Testfest",
                    "ArrangementPeriode": [{ "StartDato": "2026-12-12", "SluttDato": "2026-12-12" }],
                    "Arrangementssted": {
                        "StedsNavn": "Festsalen",
                        "StedsAdresse": { "Gateadresse": "Testveien 1" }
                    }
                },
                "Bevillingsansvarlig": {
                    "Styrer": { "FulltNavn": "Test Person", "Foedselsnummer": "01039012345" },
                    "Stedfortreder": { "Fornavn": "Ole", "Etternavn": "Hansen", "Foedselsnummer": "01019012345" }
                },
                "PersonerMedInnflytelse": { "FysiskePersoner": [], "JuridiskePersoner": [] },
                "VedleggsListe": { "Rader": [] }
            }
        }
        """;

    [Fact]
    public async Task PostGenerate_WithValidFile_ReturnsJsonWithMultiplePdfs()
    {
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(Encoding.UTF8.GetBytes(TestApplicationJson));
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");
        content.Add(fileContent, "file", "test.json");

        var response = await _client.PostAsync("/generate", content);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType!.MediaType.Should().Be("application/json");

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);

        var pdfs = doc.RootElement.GetProperty("pdfs");
        // pipeline.yaml currently defines 2 PDF steps (request-info + checklist-agent).
        // Older config also included a decision-agent step, hence the original >=3 expectation.
        pdfs.GetArrayLength().Should().BeGreaterOrEqualTo(2);

        foreach (var pdf in pdfs.EnumerateArray())
        {
            pdf.GetProperty("name").GetString().Should().EndWith(".pdf");

            var base64 = pdf.GetProperty("data").GetString()!;
            var pdfBytes = Convert.FromBase64String(base64);
            pdfBytes.Should().NotBeEmpty();
            Encoding.ASCII.GetString(pdfBytes, 0, 5).Should().Be("%PDF-");
        }
    }

    [Fact]
    public async Task PostGenerate_WithInvalidContentType_Returns400()
    {
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent("hello"u8.ToArray());
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("text/plain");
        content.Add(fileContent, "file", "test.txt");

        var response = await _client.PostAsync("/generate", content);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PostGenerate_WithNoFiles_Returns400()
    {
        using var content = new MultipartFormDataContent();
        content.Add(new StringContent("value"), "some-field");

        var response = await _client.PostAsync("/generate", content);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
