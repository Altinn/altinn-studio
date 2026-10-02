using Altinn.App.Core.Extensions;

namespace Altinn.App.Core.Tests.Extensions;

public class StreamExtensionsTests
{
    [Fact]
    public async Task ReadAllBytes_Reads_The_Rest_Of_A_Stream_That_Knows_Its_Length()
    {
        using var stream = new MemoryStream([1, 2, 3, 4]);
        stream.Position = 1;

        byte[] bytes = await stream.ReadAllBytes(CancellationToken.None);

        Assert.Equal([2, 3, 4], bytes);
    }

    [Fact]
    public async Task ReadAllBytes_Reads_A_Stream_That_Does_Not_Know_Its_Length()
    {
        using var stream = new UnseekableStream([1, 2, 3]);

        byte[] bytes = await stream.ReadAllBytes(CancellationToken.None);

        Assert.Equal([1, 2, 3], bytes);
    }

    private sealed class UnseekableStream(byte[] bytes) : MemoryStream(bytes)
    {
        public override bool CanSeek => false;
    }
}
