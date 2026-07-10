using System.Text;
using System.Text.Json;
using Altinn.App.Ai.Enrichment.Configuration;
using Altinn.App.Ai.Enrichment.Rendering;
using Altinn.App.Ai.Enrichment.Tests.Helpers;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Altinn.App.Ai.Enrichment.Tests.Unit.Rendering;

public class TypstRendererTests
{
    private readonly TypstRenderer? _sut;

    public TypstRendererTests()
    {
        var typstPath = TypstLocator.FindTypst();
        if (typstPath == null)
        {
            return;
        }

        var options = Options.Create(new TypstOptions { BinaryPath = typstPath });
        _sut = new TypstRenderer(NullLogger<TypstRenderer>.Instance, options);
    }

    [Fact]
    public async Task RenderPdf_ReturnsPdfBytes()
    {
        if (_sut == null)
        {
            return; // Skip: Typst not installed
        }

        using var data = CreateMinimalInfoData();
        var result = await _sut.RenderPdfAsync(data, Path.Combine(TestPaths.DemoTemplates, "info.typ"));

        result.Should().NotBeEmpty();
        Encoding.ASCII.GetString(result, 0, 5).Should().Be("%PDF-");
    }

    [Fact]
    public async Task RenderPdf_WithFullData_ProducesValidPdf()
    {
        if (_sut == null)
        {
            return; // Skip: Typst not installed
        }

        using var data = CreateFullInfoData();
        var result = await _sut.RenderPdfAsync(data, Path.Combine(TestPaths.DemoTemplates, "info.typ"));

        result.Should().NotBeEmpty();
        Encoding.ASCII.GetString(result, 0, 5).Should().Be("%PDF-");
    }

    private static JsonDocument CreateMinimalInfoData()
    {
        return JsonDocument.Parse("""
            {
                "meta": { "dato": "2026-12-01", "saksbehandler": "KI-agent" },
                "soker": { "navn": "Test Testesen" },
                "booking": { "rom": "Møterom 101", "dato": "2026-12-19", "start": "17:00", "slutt": "20:00", "formaal": "Årsmøte" },
                "vedlegg": []
            }
            """);
    }

    private static JsonDocument CreateFullInfoData()
    {
        return JsonDocument.Parse("""
            {
                "meta": { "dato": "2026-12-01", "saksbehandler": "KI-agent" },
                "soker": { "navn": "Test Testesen" },
                "booking": { "rom": "Møterom 202", "dato": "2026-12-19", "start": "08:00", "slutt": "12:00", "formaal": "Kursdag med eksterne deltakere" },
                "vedlegg": ["vedtekter.pdf", "program.pdf"]
            }
            """);
    }
}
