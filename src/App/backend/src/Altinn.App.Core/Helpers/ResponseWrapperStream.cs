namespace Altinn.App.Core.Helpers;

/// <summary>
/// A wrapper stream that ensures proper disposal of an HttpResponseMessage along with its content stream.
/// </summary>
internal sealed class ResponseWrapperStream : Stream
{
    private readonly HttpResponseMessage _response;
    private readonly Stream _innerStream;

    private ResponseWrapperStream(HttpResponseMessage response, Stream innerStream)
    {
        ArgumentNullException.ThrowIfNull(response);
        ArgumentNullException.ThrowIfNull(innerStream);

        _response = response;
        _innerStream = innerStream;
    }

    /// <summary>
    /// Reads <paramref name="response"/>'s content as a stream and wraps the pair, handing ownership of
    /// the response to the stream returned: disposing that stream disposes the response. This is the only
    /// way to create a <see cref="ResponseWrapperStream"/>, so the ownership transfer cannot be skipped.
    /// </summary>
    /// <remarks>
    /// For a method that returns a stream taken from a response, this is the alternative to a
    /// <c>using</c> on the response — which would dispose the content the returned stream reads from,
    /// and fail in the caller rather than here. Ownership transfer is atomic: if the content stream
    /// cannot be read, the response is disposed before the exception propagates, so a call that throws
    /// leaks nothing and leaves the caller nothing to clean up.
    /// </remarks>
    /// <param name="response">The response to take over. Owned by the returned stream once this succeeds.</param>
    /// <param name="cancellationToken">Cancels reading the content stream.</param>
    /// <returns>A stream over the response content that disposes the response when disposed.</returns>
    public static async Task<Stream> Create(HttpResponseMessage response, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(response);

        try
        {
            Stream stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            return new ResponseWrapperStream(response, stream);
        }
        catch
        {
            response.Dispose();
            throw;
        }
    }

    /// <summary>
    /// Releases the unmanaged resources used by the <see cref="ResponseWrapperStream"/> and optionally releases the managed resources.
    /// </summary>
    /// <param name="disposing">true to release both managed and unmanaged resources; false to release only unmanaged resources.</param>
    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _response.Dispose(); // This will also dispose the inner stream
        }

        base.Dispose(disposing);
    }

    // Delegate all Stream operations to _innerStream

    /// <summary>
    /// Gets a value indicating whether the current stream supports reading.
    /// </summary>
    public override bool CanRead => _innerStream.CanRead;

    /// <summary>
    /// Gets a value indicating whether the current stream supports seeking.
    /// </summary>
    public override bool CanSeek => _innerStream.CanSeek;

    /// <summary>
    /// Gets a value indicating whether the current stream supports writing.
    /// </summary>
    public override bool CanWrite => _innerStream.CanWrite;

    /// <summary>
    /// Gets the length in bytes of the stream.
    /// </summary>
    /// <exception cref="NotSupportedException">The stream does not support seeking.</exception>
    public override long Length => _innerStream.Length;

    /// <summary>
    /// Gets or sets the position within the current stream.
    /// </summary>
    /// <exception cref="NotSupportedException">The stream does not support seeking.</exception>
    public override long Position
    {
        get => _innerStream.Position;
        set => _innerStream.Position = value;
    }

    /// <summary>
    /// Clears all buffers for this stream and causes any buffered data to be written to the underlying device.
    /// </summary>
    public override void Flush() => _innerStream.Flush();

    /// <summary>
    /// Asynchronously clears all buffers for this stream and causes any buffered data to be written to the underlying device.
    /// </summary>
    /// <param name="cancellationToken">The token to monitor for cancellation requests.</param>
    /// <returns>A task that represents the asynchronous flush operation.</returns>
    public override Task FlushAsync(CancellationToken cancellationToken) => _innerStream.FlushAsync(cancellationToken);

    /// <summary>
    /// Reads a sequence of bytes from the current stream and advances the position within the stream by the number of bytes read.
    /// </summary>
    /// <param name="buffer">An array of bytes. When this method returns, the buffer contains the specified byte array with the values between offset and (offset + count - 1) replaced by the bytes read from the current source.</param>
    /// <param name="offset">The zero-based byte offset in buffer at which to begin storing the data read from the current stream.</param>
    /// <param name="count">The maximum number of bytes to be read from the current stream.</param>
    /// <returns>The total number of bytes read into the buffer. This can be less than the number of bytes requested if that many bytes are not currently available, or zero (0) if the end of the stream has been reached.</returns>
    /// <exception cref="ArgumentNullException">buffer is null.</exception>
    /// <exception cref="ArgumentOutOfRangeException">offset or count is negative.</exception>
    /// <exception cref="ArgumentException">The sum of offset and count is larger than the buffer length.</exception>
    /// <exception cref="NotSupportedException">The stream does not support reading.</exception>
    public override int Read(byte[] buffer, int offset, int count) => _innerStream.Read(buffer, offset, count);

    /// <summary>
    /// Asynchronously reads a sequence of bytes from the current stream and advances the position within the stream by the number of bytes read.
    /// </summary>
    /// <param name="buffer">The buffer to write the data into.</param>
    /// <param name="offset">The byte offset in buffer at which to begin writing data from the stream.</param>
    /// <param name="count">The maximum number of bytes to read.</param>
    /// <param name="cancellationToken">The token to monitor for cancellation requests.</param>
    /// <returns>A task that represents the asynchronous read operation. The value contains the total number of bytes read into the buffer.</returns>
    public override Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken) =>
        _innerStream.ReadAsync(buffer, offset, count, cancellationToken);

    /// <summary>
    /// Asynchronously reads a sequence of bytes from the current stream and advances the position within the stream by the number of bytes read.
    /// </summary>
    /// <param name="buffer">The region of memory to write the data into.</param>
    /// <param name="cancellationToken">The token to monitor for cancellation requests.</param>
    /// <returns>A task that represents the asynchronous read operation. The value contains the total number of bytes read into the buffer.</returns>
    public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default) =>
        _innerStream.ReadAsync(buffer, cancellationToken);

    /// <summary>
    /// Reads a sequence of bytes from the current stream and advances the position within the stream by the number of bytes read.
    /// </summary>
    /// <param name="buffer">The region of memory to write the data into.</param>
    /// <returns>The total number of bytes read into the buffer.</returns>
    public override int Read(Span<byte> buffer) => _innerStream.Read(buffer);

    // CopyTo/CopyToAsync are delegated rather than left to the base implementation, which would read
    // through this wrapper in chunks. A buffered response hands out a MemoryStream, whose own copy is a
    // single block copy, and the PDF and signing paths copy these streams wholesale (PdfService,
    // SigningServiceTask and PaymentProcessTask all call CopyToAsync on the stream they are handed).
    // Note that MVC's FileStreamResult does not come through here — it runs its own pooled-buffer loop
    // over ReadAsync(Memory<byte>), which is delegated above.

    /// <summary>
    /// Reads the bytes from the current stream and writes them to another stream.
    /// </summary>
    /// <param name="destination">The stream to which the contents of the current stream will be copied.</param>
    /// <param name="bufferSize">The size of the buffer, in bytes.</param>
    public override void CopyTo(Stream destination, int bufferSize) => _innerStream.CopyTo(destination, bufferSize);

    /// <summary>
    /// Asynchronously reads the bytes from the current stream and writes them to another stream.
    /// </summary>
    /// <param name="destination">The stream to which the contents of the current stream will be copied.</param>
    /// <param name="bufferSize">The size of the buffer, in bytes.</param>
    /// <param name="cancellationToken">The token to monitor for cancellation requests.</param>
    /// <returns>A task that represents the asynchronous copy operation.</returns>
    public override Task CopyToAsync(Stream destination, int bufferSize, CancellationToken cancellationToken) =>
        _innerStream.CopyToAsync(destination, bufferSize, cancellationToken);

    /// <summary>
    /// Sets the position within the current stream.
    /// </summary>
    /// <param name="offset">A byte offset relative to the origin parameter.</param>
    /// <param name="origin">A value of type <see cref="SeekOrigin"/> indicating the reference point used to obtain the new position.</param>
    /// <returns>The new position within the current stream.</returns>
    /// <exception cref="NotSupportedException">The stream does not support seeking.</exception>
    public override long Seek(long offset, SeekOrigin origin) => _innerStream.Seek(offset, origin);

    /// <summary>
    /// Sets the length of the current stream.
    /// </summary>
    /// <param name="value">The desired length of the current stream in bytes.</param>
    /// <exception cref="NotSupportedException">The stream does not support both writing and seeking.</exception>
    /// <exception cref="ArgumentOutOfRangeException">value is negative.</exception>
    public override void SetLength(long value) => _innerStream.SetLength(value);

    /// <summary>
    /// Writes a sequence of bytes to the current stream and advances the current position within this stream by the number of bytes written.
    /// </summary>
    /// <param name="buffer">An array of bytes. This method copies count bytes from buffer to the current stream.</param>
    /// <param name="offset">The zero-based byte offset in buffer at which to begin copying bytes to the current stream.</param>
    /// <param name="count">The number of bytes to be written to the current stream.</param>
    /// <exception cref="ArgumentNullException">buffer is null.</exception>
    /// <exception cref="ArgumentOutOfRangeException">offset or count is negative.</exception>
    /// <exception cref="ArgumentException">The sum of offset and count is greater than the buffer length.</exception>
    /// <exception cref="NotSupportedException">The stream does not support writing.</exception>
    public override void Write(byte[] buffer, int offset, int count) => _innerStream.Write(buffer, offset, count);

    /// <summary>
    /// Asynchronously writes a sequence of bytes to the current stream and advances the current position within this stream by the number of bytes written.
    /// </summary>
    /// <param name="buffer">The buffer to write data from.</param>
    /// <param name="offset">The zero-based byte offset in buffer from which to begin copying bytes to the stream.</param>
    /// <param name="count">The number of bytes to write.</param>
    /// <param name="cancellationToken">The token to monitor for cancellation requests.</param>
    /// <returns>A task that represents the asynchronous write operation.</returns>
    public override Task WriteAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken) =>
        _innerStream.WriteAsync(buffer, offset, count, cancellationToken);

    /// <summary>
    /// Asynchronously writes a sequence of bytes to the current stream and advances the current position within this stream by the number of bytes written.
    /// </summary>
    /// <param name="buffer">The region of memory to write data from.</param>
    /// <param name="cancellationToken">The token to monitor for cancellation requests.</param>
    /// <returns>A task that represents the asynchronous write operation.</returns>
    public override ValueTask WriteAsync(ReadOnlyMemory<byte> buffer, CancellationToken cancellationToken = default) =>
        _innerStream.WriteAsync(buffer, cancellationToken);
}
