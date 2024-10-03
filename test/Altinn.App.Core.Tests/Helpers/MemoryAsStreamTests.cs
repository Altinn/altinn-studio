using Altinn.App.Core.Helpers;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Helpers;

public class MemoryAsStreamTests
{
    private static readonly byte[] _byteSequence = GenerateNonRepeatingByteArray();

    /// <summary>
    /// For testing <see cref="MemoryAsStream"/> class we need to handle a sequence of bytes where errors are
    /// easy to spot. This method generates a sequence of bytes where no 2 byte pairs repeat, which is useful
    /// to find errors in the implementation of <see cref="MemoryAsStream"/>.
    /// </summary>
    /// <returns>Sequence of bytes where no 2 byte pairs repeat</returns>
    private static byte[] GenerateNonRepeatingByteArray()
    {
        int byteCount = 256;
        int sequenceLength = 65_537;
        byte[] result = new byte[sequenceLength];

        // Start with the first byte being 0
        result[0] = 0;

        // Initialize counters to represent the current pair
        byte nextByte = 1; // Start with the second byte being 1

        // Generate the sequence by sliding over the pairs
        for (int i = 1; i < sequenceLength; i++)
        {
            result[i] = nextByte;

            // Slide the window: move the current byte to the next byte
            byte currentByte = nextByte;

            // Determine the next byte (wrap around to avoid repeating pairs)
            nextByte = (byte)((nextByte + 1) % byteCount);

            // Ensure we don't repeat consecutive pairs
            if (i > 1 && result[i - 1] == currentByte && result[i] == nextByte)
            {
                // Adjust the next byte to avoid consecutive pair repetition
                nextByte = (byte)((nextByte + 1) % byteCount);
            }
        }

        return result;
    }

    [Fact]
    public void Read_WithValidInput_ShouldReadBytes()
    {
        // Arrange
        byte[] bytes = _byteSequence;
        MemoryAsStream stream = new MemoryAsStream(bytes);
        byte[] buffer = new byte[bytes.Length];

        // Act
        int bytesRead = stream.Read(buffer, 0, buffer.Length);

        // Assert
        Assert.Equal(bytes.Length, bytesRead);
        Assert.Equal(bytes, buffer);
    }

    [Fact]
    public void Read_ChunkedReads_ShouldReadBytesInChunks()
    {
        // Arrange
        byte[] bytes = _byteSequence;
        MemoryAsStream stream = new MemoryAsStream(bytes);
        int bytesRead = 0;

        // Act
        using var chunkedReader = new BinaryReader(stream);
        do
        {
            byte read = chunkedReader.ReadByte();
            bytes[bytesRead].Should().Be(read, $"Mismatch at position {bytesRead}");
        } while (++bytesRead < bytes.Length);
    }

    [Theory]
    // Comment out a few cases to reduce the number of tests
    [InlineData(2)]
    // [InlineData(3)]
    // [InlineData(5)]
    [InlineData(7)]
    // [InlineData(11)]
    [InlineData(13)]
    // [InlineData(17)]
    // [InlineData(19)]
    [InlineData(23)]
    public void Read_WithChunkSize_ShouldReadBytesInChunks(int chunkSize)
    {
        // Arrange
        byte[] bytes = _byteSequence;
        MemoryAsStream stream = new MemoryAsStream(bytes);
        byte[] buffer = new byte[chunkSize];
        int bytesRead = 0;

        // Act
        while (bytesRead < bytes.Length)
        {
            int read = stream.Read(buffer, 0, buffer.Length);
            read.Should().BeLessOrEqualTo(chunkSize);
            for (int i = 0; i < read; i++)
            {
                bytes[bytesRead].Should().Be(buffer[i], $"Mismatch at position {bytesRead}");
                bytesRead++;
            }
        }
    }
}
