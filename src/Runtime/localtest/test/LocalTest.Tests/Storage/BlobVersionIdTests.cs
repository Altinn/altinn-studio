using Altinn.Platform.Storage.Models;
using Xunit;

namespace LocalTest.Tests.Storage;

public sealed class BlobVersionIdTests
{
    [Fact]
    public void Encode_UsesBase64UrlEncodedUuidBytes()
    {
        Guid version = Guid.Parse("11111111-1111-1111-1111-111111111111");

        string encoded = BlobVersionId.Encode(version);

        Assert.Equal("EREREREREREREREREREREQ", encoded);
        Assert.Equal(22, encoded.Length);
        Assert.Equal(version, BlobVersionId.Decode(encoded));
    }

    [Fact]
    public void Decode_InvalidBase64Url_WrapsFormatException()
    {
        FormatException exception = Assert.Throws<FormatException>(() =>
            BlobVersionId.Decode("**********************")
        );

        Assert.Equal("Invalid blob version id.", exception.Message);
        Assert.IsType<FormatException>(exception.InnerException);
    }

    [Fact]
    public void Decode_WhitespaceShortDecode_WrapsFormatException()
    {
        FormatException exception = Assert.Throws<FormatException>(() =>
            BlobVersionId.Decode("ERERERERERERERERERER  ")
        );

        Assert.Equal("Invalid blob version id.", exception.Message);
        Assert.IsType<FormatException>(exception.InnerException);
    }

    [Fact]
    public void TryDecode_WithValidValue_ReturnsGuid()
    {
        Guid version = Guid.Parse("11111111-1111-1111-1111-111111111111");

        bool decoded = BlobVersionId.TryDecode(BlobVersionId.Encode(version), out Guid actual);

        Assert.True(decoded);
        Assert.Equal(version, actual);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("ERERERERERERERERERERE")]
    [InlineData("**********************")]
    [InlineData("ERERERERERERERERERER  ")]
    public void TryDecode_WithInvalidValue_ReturnsFalse(string? versionId)
    {
        bool decoded = BlobVersionId.TryDecode(versionId, out Guid version);

        Assert.False(decoded);
        Assert.Equal(Guid.Empty, version);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void ToETag_WithoutBlobVersionId_ReturnsNull(string? blobVersionId)
    {
        Assert.Null(BlobVersionId.ToETag(blobVersionId));
    }

    [Fact]
    public void ToETag_WithBlobVersionId_ReturnsQuotedValue()
    {
        const string blobVersionId = "EREREREREREREREREREREQ";

        Assert.Equal($"\"{blobVersionId}\"", BlobVersionId.ToETag(blobVersionId));
    }

    [Fact]
    public void TryParseETag_WithValidStrongEtag_ReturnsBlobVersionId()
    {
        const string blobVersionId = "EREREREREREREREREREREQ";

        bool parsed = BlobVersionId.TryParseETag($"\"{blobVersionId}\"", out string? actual);

        Assert.True(parsed);
        Assert.Equal(blobVersionId, actual);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("EREREREREREREREREREREQ")]
    [InlineData("W/\"EREREREREREREREREREREQ\"")]
    [InlineData("*")]
    [InlineData("\"\"")]
    [InlineData("\"")]
    [InlineData("EREREREREREREREREREREQ\"")]
    [InlineData("\"EREREREREREREREREREREQ")]
    [InlineData("\"ERERERERER\"EREREREREREQ\"")]
    [InlineData("\"ERERERERER\\\"EREREREREREQ\"")]
    [InlineData(" \"EREREREREREREREREREREQ\" ")]
    [InlineData("\"ERERERERER\\u0001EREREREREREQ\"")]
    [InlineData("\"ERERERERERERERERERERE!\"")]
    [InlineData("\"ERERERERERERERERERERE\"")]
    public void TryParseETag_WithInvalidValue_ReturnsFalse(string? etag)
    {
        bool parsed = BlobVersionId.TryParseETag(etag, out string? blobVersionId);

        Assert.False(parsed);
        Assert.Null(blobVersionId);
    }
}
