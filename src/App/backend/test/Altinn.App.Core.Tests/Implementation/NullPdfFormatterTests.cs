#nullable disable
using Altinn.App.Core.Features.Pdf;
using Altinn.App.Core.Models;
using Altinn.App.PlatformServices.Tests.Implementation.TestResources;
using FluentAssertions;

namespace Altinn.App.PlatformServices.Tests.Implementation;

public class NullPdfFormatterTests
{
    [Fact]
    public async Task NullPdfFormatter_FormatPdf_returns_Layoutsettings_as_is()
    {
        // Arrange
        var layoutSettings = new LayoutSettings()
        {
            Components = new Components() { ExcludeFromPdf = new List<string>() { "excludeFromPdf" } },
            Pages = new Pages()
            {
                Order = new List<string>() { "Page1", "PageExcludeFromPdf" },
                ExcludeFromPdf = new List<string>() { "PageExcludeFromPdf" },
            },
        };

        var nullPdfFormatter = new NullPdfFormatter();

        // Act
        var result = await nullPdfFormatter.FormatPdf(layoutSettings, new DummyModel());

        // Assert
        result.Should().BeEquivalentTo(layoutSettings);
    }
}
