using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace Designer.Tests.Utils;

/// <summary>
/// A readable stream that returns its first part, then waits until the test resumes or fails it.
/// </summary>
public sealed class PausingStream(byte[] firstPart, byte[] secondPart) : Stream
{
    private readonly TaskCompletionSource _paused = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private readonly TaskCompletionSource _resumed = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private int _readCount;

    public Task Paused => _paused.Task;

    public void Resume() => _resumed.SetResult();

    public void Fail(Exception exception) => _resumed.SetException(exception);

    public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
    {
        switch (_readCount++)
        {
            case 0:
                firstPart.CopyTo(buffer);
                return firstPart.Length;
            case 1:
                _paused.SetResult();
                await _resumed.Task;
                secondPart.CopyTo(buffer);
                return secondPart.Length;
            default:
                return 0;
        }
    }

    public override Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken) =>
        ReadAsync(buffer.AsMemory(offset, count), cancellationToken).AsTask();

    public override int Read(byte[] buffer, int offset, int count) => throw new NotSupportedException();

    public override bool CanRead => true;
    public override bool CanSeek => false;
    public override bool CanWrite => false;
    public override long Length => throw new NotSupportedException();
    public override long Position
    {
        get => throw new NotSupportedException();
        set => throw new NotSupportedException();
    }

    public override void Flush() { }

    public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();

    public override void SetLength(long value) => throw new NotSupportedException();

    public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
}
