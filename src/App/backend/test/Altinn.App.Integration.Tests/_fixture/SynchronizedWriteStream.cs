namespace Altinn.App.Integration.Tests;

internal sealed class SynchronizedWriteStream(Stream _inner) : Stream
{
    private readonly SemaphoreSlim _lock = new(1, 1);

    public override bool CanRead => false;
    public override bool CanSeek => false;
    public override bool CanWrite => true;
    public override bool CanTimeout => _inner.CanTimeout;
    public override long Length => _inner.Length;
    public override long Position
    {
        get => _inner.Position;
        set => throw new NotSupportedException();
    }

    public override int WriteTimeout
    {
        get => _inner.WriteTimeout;
        set => _inner.WriteTimeout = value;
    }

    public override void Write(byte[] buffer, int offset, int count)
    {
        _lock.Wait();
        try
        {
            _inner.Write(buffer, offset, count);
        }
        finally
        {
            _lock.Release();
        }
    }

    public override async Task WriteAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken);
        try
        {
            await _inner.WriteAsync(buffer, offset, count, cancellationToken);
        }
        finally
        {
            _lock.Release();
        }
    }

    public override void Write(ReadOnlySpan<byte> buffer)
    {
        _lock.Wait();
        try
        {
            _inner.Write(buffer);
        }
        finally
        {
            _lock.Release();
        }
    }

    public override async ValueTask WriteAsync(
        ReadOnlyMemory<byte> buffer,
        CancellationToken cancellationToken = default
    )
    {
        await _lock.WaitAsync(cancellationToken);
        try
        {
            await _inner.WriteAsync(buffer, cancellationToken);
        }
        finally
        {
            _lock.Release();
        }
    }

    public override void WriteByte(byte value)
    {
        _lock.Wait();
        try
        {
            _inner.WriteByte(value);
        }
        finally
        {
            _lock.Release();
        }
    }

    public override void Flush()
    {
        _lock.Wait();
        try
        {
            _inner.Flush();
        }
        finally
        {
            _lock.Release();
        }
    }

    public override async Task FlushAsync(CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken);
        try
        {
            await _inner.FlushAsync(cancellationToken);
        }
        finally
        {
            _lock.Release();
        }
    }

    private bool _disposed;

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            if (_disposed)
                return;
            _lock.Wait();
            try
            {
                if (_disposed)
                    return;
                _disposed = true;
                _inner.Dispose();
            }
            finally
            {
                _lock.Release();
            }
            _lock.Dispose();
        }
    }

    public override async ValueTask DisposeAsync()
    {
        if (_disposed)
            return;
        await _lock.WaitAsync();
        try
        {
            if (_disposed)
                return;
            _disposed = true;
            await _inner.DisposeAsync();
        }
        finally
        {
            _lock.Release();
        }
        _lock.Dispose();
    }

    public override bool Equals(object? obj) => _inner.Equals(obj);

    public override int GetHashCode() => _inner.GetHashCode();

    public override string? ToString() => _inner.ToString();

    // Not supported operations below

    public override int Read(Span<byte> buffer) => throw new NotSupportedException();

    public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default) =>
        throw new NotSupportedException();

    public override Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken) =>
        throw new NotSupportedException();

    public override int ReadByte() => throw new NotSupportedException();

    public override int ReadTimeout
    {
        get => throw new NotSupportedException();
        set => throw new NotSupportedException();
    }

    public override IAsyncResult BeginRead(
        byte[] buffer,
        int offset,
        int count,
        AsyncCallback? callback,
        object? state
    ) => throw new NotSupportedException();

    public override int EndRead(IAsyncResult asyncResult) => throw new NotSupportedException();

    public override int Read(byte[] buffer, int offset, int count) => throw new NotSupportedException();

    public override IAsyncResult BeginWrite(
        byte[] buffer,
        int offset,
        int count,
        AsyncCallback? callback,
        object? state
    ) => throw new NotSupportedException();

    public override void EndWrite(IAsyncResult asyncResult) => throw new NotSupportedException();

    public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();

    public override void SetLength(long value) => throw new NotSupportedException();

    public override void CopyTo(Stream destination, int bufferSize) => throw new NotSupportedException();

    public override Task CopyToAsync(Stream destination, int bufferSize, CancellationToken cancellationToken) =>
        throw new NotSupportedException();
}
