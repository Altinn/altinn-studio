using System.Text;
using System.Text.Json;
using Altinn.Augmenter.Agent.Configuration;
using Altinn.Augmenter.Agent.Pipelines;
using Altinn.Augmenter.Agent.Tests.Integration.Helpers;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Tests.Unit;

public class PdfGeneratorServiceTests
{
    private readonly PdfGeneratorService? _sut;

    public PdfGeneratorServiceTests()
    {
        var typstPath = TypstLocator.FindTypst();
        if (typstPath == null)
        {
            return;
        }

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Typst:Path"] = typstPath,
            })
            .Build();

        var pdfOptions = Options.Create(new PdfGenerationOptions());

        _sut = new PdfGeneratorService(NullLogger<PdfGeneratorService>.Instance, config, pdfOptions);
    }

    [Fact]
    public async Task GeneratePdf_ReturnsPdfBytes()
    {
        if (_sut == null)
        {
            return; // Skip: Typst not installed
        }

        using var data = CreateMinimalRequestInfoData();
        var result = await _sut.GeneratePdfAsync(data, Path.Combine(ConfigLocator.GetTemplatesRoot(), "request-info.typ"));

        result.Should().NotBeEmpty();
        Encoding.ASCII.GetString(result, 0, 5).Should().Be("%PDF-");
    }

    [Fact]
    public async Task GeneratePdf_WithFullData_ProducesValidPdf()
    {
        if (_sut == null)
        {
            return; // Skip: Typst not installed
        }

        using var data = CreateFullRequestInfoData();
        var result = await _sut.GeneratePdfAsync(data, Path.Combine(ConfigLocator.GetTemplatesRoot(), "request-info.typ"));

        result.Should().NotBeEmpty();
        Encoding.ASCII.GetString(result, 0, 5).Should().Be("%PDF-");
    }

    private static JsonDocument CreateMinimalRequestInfoData()
    {
        return JsonDocument.Parse("""
            {
                "type-sak": "enkeltbevilling",
                "sted": { "navn": "Teststed", "adresse": "Testveien 1" },
                "personer": [{ "rolle": "Styrer", "navn": "Test Person", "id": "01039012345" }],
                "lovhenvisninger": ["Alkoholloven \u00a7\u00a71-7"]
            }
            """);
    }

    private static JsonDocument CreateFullRequestInfoData()
    {
        return JsonDocument.Parse("""
            {
                "type-sak": "enkeltbevilling",
                "sted": { "navn": "Festsalen Kristiansand", "adresse": "Markens gate 10, 4611 Kristiansand" },
                "arrangementsdato": "2026-12-12",
                "personer": [
                    { "rolle": "Styrer", "navn": "Sophie Salt", "id": "01039012345" },
                    { "rolle": "Stedfortreder", "navn": "Ole Hansen", "id": "01019012345" }
                ],
                "lovhenvisninger": ["Alkoholloven \u00a7\u00a71-7, 1-7b, 1-15", "Serveringsloven \u00a7\u00a7 4, 6, 9, 11"],
                "vedlegg": []
            }
            """);
    }
}
