using System.Text;
using Altinn.Augmenter.Agent.Configuration;
using Altinn.Augmenter.Agent.Services;
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

        var result = await _sut.GeneratePdfAsync(DateTime.UtcNow);

        result.Should().NotBeEmpty();
        Encoding.ASCII.GetString(result, 0, 5).Should().Be("%PDF-");
    }

    [Fact]
    public async Task GeneratePdf_WithDifferentTimestamps_ProducesValidPdf()
    {
        if (_sut == null)
        {
            return; // Skip: Typst not installed
        }

        var timestamp = new DateTime(2024, 6, 15, 12, 30, 0, DateTimeKind.Utc);
        var result = await _sut.GeneratePdfAsync(timestamp);

        result.Should().NotBeEmpty();
        Encoding.ASCII.GetString(result, 0, 5).Should().Be("%PDF-");
    }
}
