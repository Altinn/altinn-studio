using Altinn.App.Clients.Fiks.Extensions;

namespace Altinn.App.Clients.Fiks.Tests.Extensions;

public class StreamExtensionsTest
{
    [Theory]
    [InlineData(null)]
    [InlineData(34)]
    public void ReadToString_ReturnsCorrectString(int? streamPosition)
    {
        // Arrange
        var input = Guid.NewGuid().ToString();
        using var stream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(input));
        if (streamPosition.HasValue)
            stream.Position = streamPosition.Value;

        // Act
        var result = stream.ReadToString();

        // Assert
        Assert.Equal(input, result);
    }

    [Fact]
    public void ReadToString_EmptyStream_ReturnsEmptyString()
    {
        // Arrange
        using var stream = new MemoryStream();

        // Act
        var result = stream.ReadToString();

        // Assert
        Assert.Equal(string.Empty, result);
    }

    [Fact]
    public void ReadToString_NullStream_ThrowsArgumentNullException()
    {
        Stream stream = null!;
        Assert.Throws<ArgumentNullException>(() => stream.ReadToString());
    }
}
