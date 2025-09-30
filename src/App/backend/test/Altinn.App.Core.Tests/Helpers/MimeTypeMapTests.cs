#nullable disable
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Models;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Helpers;

public class MimeTypeMapTests
{
    [Theory]
    [InlineData(".pdf")]
    [InlineData(".pDF")]
    public void GetMimeType_ShouldNotBe_CaseSensitive(string extension)
    {
        // Act
        var mimeType = MimeTypeMap.GetMimeType(extension);

        // Assert
        mimeType.ToString().Should().BeEquivalentTo("application/pdf");
    }

    [Fact]
    public void GetMimeType_ShouldReturnCorrectMimeType_for_pdf()
    {
        // Arrange
        string extension = ".pdf";

        // Act
        var mimeType = MimeTypeMap.GetMimeType(extension);

        // Assert
        mimeType.ToString().Should().BeEquivalentTo("application/pdf");
    }

    [Fact]
    public void GetMimeType_ShouldReturnCorrectMimeType_for_pdf_without_leading_dot()
    {
        // Arrange
        string extension = "pdf";

        // Act
        var mimeType = MimeTypeMap.GetMimeType(extension);

        // Assert
        mimeType.ToString().Should().BeEquivalentTo("application/pdf");
    }

    [Fact]
    public void GetMimeType_ShouldReturnCorrectMimeType_for_zip()
    {
        // Arrange
        string extension = ".zip";

        // Act
        var mimeType = MimeTypeMap.GetMimeType(extension);

        // Assert
        mimeType.ToString().Should().BeEquivalentTo("application/zip");
    }

    [Fact]
    public void GetMimeType_ShouldReturnCorrectMimeType_matching_x_zip_compressed()
    {
        // Arrange
        string extension = ".zip";

        // Act
        var mimeType = MimeTypeMap.GetMimeType(extension);

        // Assert
        mimeType.IsMatch("application/zip").Should().BeTrue();
        mimeType.IsMatch("application/x-zip-compressed").Should().BeTrue();
        mimeType.IsMatch("application/pdf").Should().BeFalse();
    }

    [Fact]
    public void GetMimeType_throws_ArgumentNullException_if_extension_null()
    {
        Action act = () => MimeTypeMap.GetMimeType(null);
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void GetMimeType_returns_octetstream_for_unknown_fileextension()
    {
        var mimetype = MimeTypeMap.GetMimeType(".unknown");
        mimetype.Should().BeEquivalentTo(new MimeType("application/octet-stream"));
    }
}
