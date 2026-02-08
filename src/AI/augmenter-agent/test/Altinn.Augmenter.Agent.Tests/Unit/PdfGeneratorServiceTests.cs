using System.Text;
using Altinn.Augmenter.Agent.Services;
using Altinn.Augmenter.Agent.Tests.Integration.Helpers;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace Altinn.Augmenter.Agent.Tests.Unit;

public class PdfGeneratorServiceTests
{
    private readonly PdfGeneratorService _sut;

    public PdfGeneratorServiceTests()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Typst:Path"] = TypstLocator.FindTypst(),
            })
            .Build();

        _sut = new PdfGeneratorService(NullLogger<PdfGeneratorService>.Instance, config);
    }

    [Fact]
    public async Task GeneratePdf_ReturnsPdfBytes()
    {
        var result = await _sut.GeneratePdfAsync(DateTime.UtcNow);

        result.Should().NotBeEmpty();
        Encoding.ASCII.GetString(result, 0, 5).Should().Be("%PDF-");
    }

    [Fact]
    public async Task GeneratePdf_WithDifferentTimestamps_ProducesValidPdf()
    {
        var timestamp = new DateTime(2024, 6, 15, 12, 30, 0, DateTimeKind.Utc);
        var result = await _sut.GeneratePdfAsync(timestamp);

        result.Should().NotBeEmpty();
        Encoding.ASCII.GetString(result, 0, 5).Should().Be("%PDF-");
    }
}
