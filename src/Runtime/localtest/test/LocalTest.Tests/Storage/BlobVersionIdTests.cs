using Altinn.Platform.Storage.Models;
using Xunit;

namespace LocalTest.Tests.Storage;

public sealed class BlobVersionIdTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void ToContentEtag_WithoutBlobVersionId_ReturnsNull(string? blobVersionId)
    {
        Assert.Null(BlobVersionId.ToContentEtag(blobVersionId));
    }

    [Fact]
    public void ToContentEtag_WithBlobVersionId_ReturnsQuotedValue()
    {
        const string blobVersionId = "EREREREREREREREREREREQ";

        Assert.Equal($"\"{blobVersionId}\"", BlobVersionId.ToContentEtag(blobVersionId));
    }

    [Fact]
    public void TryParseContentEtag_WithValidStrongEtag_ReturnsBlobVersionId()
    {
        const string blobVersionId = "EREREREREREREREREREREQ";

        bool parsed = BlobVersionId.TryParseContentEtag($"\"{blobVersionId}\"", out string? actual);

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
    [InlineData("\"ERERERERER\u0001EREREREREREQ\"")]
    [InlineData("\"ERERERERERERERERERERE!\"")]
    [InlineData("\"ERERERERERERERERERERE\"")]
    public void TryParseContentEtag_WithInvalidValue_ReturnsFalse(string? etag)
    {
        bool parsed = BlobVersionId.TryParseContentEtag(etag, out string? blobVersionId);

        Assert.False(parsed);
        Assert.Null(blobVersionId);
    }
}
