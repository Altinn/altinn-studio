namespace Altinn.App.Core.Extensions;

/// <summary>
/// Extension methods for <see cref="Stream"/>
/// </summary>
internal static class StreamExtensions
{
    /// <summary>
    /// Read the rest of the stream into an array. A stream that knows its length is read straight into an array of
    /// exactly that size, so its bytes are copied once.
    /// </summary>
    internal static async Task<byte[]> ReadAllBytes(this Stream stream, CancellationToken cancellationToken)
    {
        if (stream.CanSeek)
        {
            byte[] bytes = new byte[stream.Length - stream.Position];
            await stream.ReadExactlyAsync(bytes, cancellationToken);
            return bytes;
        }

        using var buffer = new MemoryStream();
        await stream.CopyToAsync(buffer, cancellationToken);
        return buffer.ToArray();
    }
}
