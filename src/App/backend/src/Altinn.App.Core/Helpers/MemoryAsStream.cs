namespace Altinn.App.Core.Helpers;

/// <summary>
/// A read only stream that can be used to pass <see cref="ReadOnlyMemory{T}"/> to a function that request a Stream without any copying.
/// </summary>
internal class MemoryAsStream : Stream
{
    private readonly ReadOnlyMemory<byte> _memory;

    public MemoryAsStream(ReadOnlyMemory<byte> memory)
    {
        _memory = memory;
    }

    public override void Flush() { }

    public override int Read(byte[] buffer, int offset, int count)
    {
        count = (int)Math.Min(count, Length - Position);
        if (count > 0)
        {
            var toCopy = _memory.Span.Slice((int)Position, count);
            toCopy.CopyTo(buffer.AsSpan(offset));
            Position += count;
            return count;
        }

        return 0;
    }

    public override long Seek(long offset, SeekOrigin origin)
    {
        Position = origin switch
        {
            SeekOrigin.Begin => offset,
            SeekOrigin.Current => Position + offset,
            SeekOrigin.End => Length + offset, // Assume offset is negative
            _ => throw new ArgumentOutOfRangeException(nameof(origin), origin, "SeekOrigin not supported"),
        };
        // Validate position?

        return Position;
    }

    public override void SetLength(long value)
    {
        throw new NotSupportedException();
    }

    public override void Write(byte[] buffer, int offset, int count)
    {
        throw new NotSupportedException();
    }

    public override bool CanRead => true;
    public override bool CanSeek => true;
    public override bool CanWrite => false;
    public override long Length => _memory.Length;
    public override long Position { get; set; }
}
