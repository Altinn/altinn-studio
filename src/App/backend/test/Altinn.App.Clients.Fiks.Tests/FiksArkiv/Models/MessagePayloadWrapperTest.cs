using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using KS.Fiks.Arkiv.Models.V1.Kodelister;

namespace Altinn.App.Clients.Fiks.Tests.FiksArkiv.Models;

public class MessagePayloadWrapperTest
{
    private static readonly Kode _dummyCode = new(".", string.Empty);

    [Theory]
    [InlineData("PDF/A")]
    [InlineData("XML")]
    [InlineData("anything-goes")]
    public void GetFileFormat_UsesOverride_WhenFormatCodeIsProvided(string formatCode)
    {
        var wrapper = new MessagePayloadWrapper(
            new FiksIOMessagePayload("document.pdf", Stream.Null),
            _dummyCode,
            FileFormat: new FiksArkivCode { Code = formatCode },
            FileVariant: null
        );

        var result = wrapper.GetFileFormat();

        Assert.Equal(formatCode, result.KodeProperty);
    }

    [Fact]
    public void GetFileFormat_FallsBackToFileExtension_WhenFormatIsMissing()
    {
        var wrapper = new MessagePayloadWrapper(
            new FiksIOMessagePayload("report.pdf", Stream.Null),
            _dummyCode,
            FileFormat: null,
            FileVariant: null
        );

        var result = wrapper.GetFileFormat();

        Assert.Equal("PDF", result.KodeProperty);
    }

    [Fact]
    public void GetFileFormat_FallsBackToUppercasedFilename_WhenNoExtensionAndNoOverride()
    {
        var wrapper = new MessagePayloadWrapper(
            new FiksIOMessagePayload("extensionless", Stream.Null),
            _dummyCode,
            FileFormat: null,
            FileVariant: null
        );

        var result = wrapper.GetFileFormat();

        Assert.Equal("EXTENSIONLESS", result.KodeProperty);
    }

    [Fact]
    public void GetFileVariant_ReturnsNull_WhenVariantIsMissing()
    {
        var wrapper = new MessagePayloadWrapper(
            new FiksIOMessagePayload("document.pdf", Stream.Null),
            _dummyCode,
            FileFormat: null,
            FileVariant: null
        );

        var result = wrapper.GetFileVariant();

        Assert.Null(result);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void GetFileVariant_OmitsDescription_WhenDescriptionIsMissing(string? description)
    {
        var wrapper = new MessagePayloadWrapper(
            new FiksIOMessagePayload("document.pdf", Stream.Null),
            _dummyCode,
            FileFormat: null,
            FileVariant: new FiksArkivCode { Code = "P", Description = description }
        );

        var result = wrapper.GetFileVariant();

        Assert.NotNull(result);
        Assert.Equal("P", result.KodeProperty);
        Assert.Null(result.Beskrivelse);
    }

    [Fact]
    public void GetFileVariant_MapsCodeAndDescription_WhenProvided()
    {
        var wrapper = new MessagePayloadWrapper(
            new FiksIOMessagePayload("document.pdf", Stream.Null),
            _dummyCode,
            FileFormat: null,
            FileVariant: new FiksArkivCode { Code = "A", Description = "Arkivformat" }
        );

        var result = wrapper.GetFileVariant();

        Assert.NotNull(result);
        Assert.Equal("A", result.KodeProperty);
        Assert.Equal("Arkivformat", result.Beskrivelse);
    }
}
