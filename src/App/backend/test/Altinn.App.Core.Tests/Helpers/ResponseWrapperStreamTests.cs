using System.Net;
using System.Text;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Tests.TestUtils;

namespace Altinn.App.Core.Tests.Helpers;

public class ResponseWrapperStreamTests
{
    [Fact]
    public async Task Create_returns_a_readable_stream_over_the_response_content()
    {
        var (response, _) = DisposeTrackingContent.Response("hello worlds");

        using Stream stream = await ResponseWrapperStream.Create(response);

        using StreamReader reader = new(stream);
        var content = await reader.ReadToEndAsync();
        Assert.Equal("hello worlds", content);
    }

    [Fact]
    public async Task Create_does_not_dispose_the_response_while_the_stream_is_alive()
    {
        var (response, content) = DisposeTrackingContent.Response("hello worlds");

        Stream stream = await ResponseWrapperStream.Create(response);

        Assert.False(content.IsDisposed, "the returned stream is still the caller's to read");
        await stream.DisposeAsync();
    }

    [Fact]
    public async Task Disposing_the_returned_stream_disposes_the_response()
    {
        var (response, content) = DisposeTrackingContent.Response("hello worlds");

        Stream stream = await ResponseWrapperStream.Create(response);
        stream.Dispose();

        Assert.True(content.IsDisposed);
    }

    [Fact]
    public async Task Disposing_the_returned_stream_asynchronously_disposes_the_response()
    {
        var (response, content) = DisposeTrackingContent.Response("hello worlds");

        Stream stream = await ResponseWrapperStream.Create(response);
        await stream.DisposeAsync();

        Assert.True(
            content.IsDisposed,
            $"{nameof(ResponseWrapperStream)} has no DisposeAsync override, so it relies on Stream's "
                + "default implementation routing through Dispose()"
        );
    }

    [Fact]
    public async Task Create_disposes_the_response_when_the_content_stream_cannot_be_read()
    {
        ThrowingContent content = new();
        using HttpResponseMessage response = new() { Content = content };

        // HttpContent wraps a content-read failure, so the caller sees HttpRequestException over the IOException.
        var thrown = await Assert.ThrowsAsync<HttpRequestException>(async () =>
            await ResponseWrapperStream.Create(response)
        );
        var inner = Assert.IsType<IOException>(thrown.InnerException);
        Assert.Equal("cannot read this content", inner.Message);

        Assert.True(
            content.IsDisposed,
            "ownership transfer is atomic — a failed call must not leave the response for the caller to clean up"
        );
    }

    [Fact]
    public async Task Create_rejects_a_null_response()
    {
        await Assert.ThrowsAsync<ArgumentNullException>(async () => await ResponseWrapperStream.Create(null!));
    }

    [Fact]
    public async Task Stream_capabilities_are_delegated_to_the_content_stream()
    {
        var (response, _) = DisposeTrackingContent.Response("hello worlds");

        using Stream stream = await ResponseWrapperStream.Create(response);

        // A buffered response hands out a seekable stream, and ASP.NET reads CanSeek/Length off the stream
        // returned from these clients to set Content-Length on a file result.
        Assert.True(stream.CanRead);
        Assert.True(stream.CanSeek);
        Assert.Equal("hello worlds".Length, stream.Length);

        using MemoryStream destination = new();
        await stream.CopyToAsync(destination);
        Assert.Equal("hello worlds"u8.ToArray(), destination.ToArray());

        stream.Seek(0, SeekOrigin.Begin);
        Assert.Equal(0, stream.Position);
    }

    // The bulk-transfer members are overridden so a copy goes straight to the content stream's own
    // implementation — a buffered response hands out a MemoryStream, whose copy is a single block copy.
    // Stream's base implementations would produce identical bytes by looping over Read, so only asserting
    // on the bytes cannot tell the two apart. These assert on the delegation itself, which is the point.
    // Create is the only way to construct the wrapper, so the RecordingStream is planted behind it as the
    // response's content stream.

    [Fact]
    public async Task CopyTo_is_delegated_to_the_content_stream()
    {
        RecordingStream inner = new("hello worlds");
        using HttpResponseMessage response = new() { Content = new StreamHandoutContent(inner) };
        using Stream stream = await ResponseWrapperStream.Create(response);

        using MemoryStream destination = new();
        stream.CopyTo(destination);

        Assert.Equal(1, inner.CopyToCalls);
        Assert.Equal("hello worlds"u8.ToArray(), destination.ToArray());
    }

    [Fact]
    public async Task CopyToAsync_is_delegated_to_the_content_stream()
    {
        RecordingStream inner = new("hello worlds");
        using HttpResponseMessage response = new() { Content = new StreamHandoutContent(inner) };
        using Stream stream = await ResponseWrapperStream.Create(response);

        using MemoryStream destination = new();
        await stream.CopyToAsync(destination);

        Assert.Equal(1, inner.CopyToAsyncCalls);
        Assert.Equal("hello worlds"u8.ToArray(), destination.ToArray());
    }

    [Fact]
    public async Task Read_span_is_delegated_to_the_content_stream()
    {
        RecordingStream inner = new("hello worlds");
        using HttpResponseMessage response = new() { Content = new StreamHandoutContent(inner) };
        using Stream stream = await ResponseWrapperStream.Create(response);

        var buffer = new byte[5];
        var read = stream.Read(buffer.AsSpan());

        Assert.Equal(5, read);
        Assert.Equal(1, inner.ReadSpanCalls);
        Assert.Equal("hello"u8.ToArray(), buffer);
    }

    /// <summary>
    /// A stream that records which bulk-transfer members were invoked on it, so a test can tell delegation
    /// from the base <see cref="Stream"/> implementations looping over <c>Read</c>.
    /// </summary>
    private sealed class RecordingStream(string payload) : MemoryStream(Encoding.UTF8.GetBytes(payload))
    {
        public int CopyToCalls { get; private set; }
        public int CopyToAsyncCalls { get; private set; }
        public int ReadSpanCalls { get; private set; }

        public override void CopyTo(Stream destination, int bufferSize)
        {
            CopyToCalls++;
            base.CopyTo(destination, bufferSize);
        }

        public override Task CopyToAsync(Stream destination, int bufferSize, CancellationToken cancellationToken)
        {
            CopyToAsyncCalls++;
            return base.CopyToAsync(destination, bufferSize, cancellationToken);
        }

        public override int Read(Span<byte> buffer)
        {
            ReadSpanCalls++;
            return base.Read(buffer);
        }
    }

    /// <summary>
    /// Content that hands out a caller-supplied stream as its content stream, so a test can plant a
    /// <see cref="RecordingStream"/> behind <see cref="ResponseWrapperStream.Create"/> — the only way
    /// to construct the wrapper.
    /// </summary>
    private sealed class StreamHandoutContent(Stream stream) : HttpContent
    {
        protected override Task<Stream> CreateContentReadStreamAsync() => Task.FromResult(stream);

        protected override Task SerializeToStreamAsync(Stream target, TransportContext? context) =>
            stream.CopyToAsync(target);

        protected override bool TryComputeLength(out long length)
        {
            length = 0;
            return false;
        }
    }

    private sealed class ThrowingContent : HttpContent
    {
        public bool IsDisposed { get; private set; }

        protected override Task SerializeToStreamAsync(Stream stream, TransportContext? context) =>
            throw new IOException("cannot read this content");

        protected override bool TryComputeLength(out long length)
        {
            length = 0;
            return false;
        }

        protected override void Dispose(bool disposing)
        {
            IsDisposed = true;
            base.Dispose(disposing);
        }
    }
}
