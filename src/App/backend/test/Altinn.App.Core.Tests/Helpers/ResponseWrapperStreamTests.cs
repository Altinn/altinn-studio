using System.Net;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Tests.TestUtils;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Helpers;

public class ResponseWrapperStreamTests
{
    [Fact]
    public async Task TakeOwnershipOf_returns_a_readable_stream_over_the_response_content()
    {
        var (response, _) = DisposeTrackingContent.Response("hello worlds");

        using Stream stream = await ResponseWrapperStream.TakeOwnershipOf(response);

        using StreamReader reader = new(stream);
        var content = await reader.ReadToEndAsync();
        content.Should().Be("hello worlds");
    }

    [Fact]
    public async Task TakeOwnershipOf_does_not_dispose_the_response_while_the_stream_is_alive()
    {
        var (response, content) = DisposeTrackingContent.Response("hello worlds");

        Stream stream = await ResponseWrapperStream.TakeOwnershipOf(response);

        content.IsDisposed.Should().BeFalse("the returned stream is still the caller's to read");
        await stream.DisposeAsync();
    }

    [Fact]
    public async Task Disposing_the_returned_stream_disposes_the_response()
    {
        var (response, content) = DisposeTrackingContent.Response("hello worlds");

        Stream stream = await ResponseWrapperStream.TakeOwnershipOf(response);
        stream.Dispose();

        content.IsDisposed.Should().BeTrue();
    }

    [Fact]
    public async Task Disposing_the_returned_stream_asynchronously_disposes_the_response()
    {
        var (response, content) = DisposeTrackingContent.Response("hello worlds");

        Stream stream = await ResponseWrapperStream.TakeOwnershipOf(response);
        await stream.DisposeAsync();

        content
            .IsDisposed.Should()
            .BeTrue(
                $"{nameof(ResponseWrapperStream)} has no DisposeAsync override, so it relies on Stream's "
                    + "default implementation routing through Dispose()"
            );
    }

    [Fact]
    public async Task TakeOwnershipOf_disposes_the_response_when_the_content_stream_cannot_be_read()
    {
        ThrowingContent content = new();
        using HttpResponseMessage response = new() { Content = content };

        // HttpContent wraps a content-read failure, so the caller sees HttpRequestException over the IOException.
        var thrown = await Assert.ThrowsAsync<HttpRequestException>(async () =>
            await ResponseWrapperStream.TakeOwnershipOf(response)
        );
        thrown.InnerException.Should().BeOfType<IOException>().Which.Message.Should().Be("cannot read this content");

        content
            .IsDisposed.Should()
            .BeTrue(
                "ownership transfer is atomic — a failed call must not leave the response for the caller to clean up"
            );
    }

    [Fact]
    public async Task TakeOwnershipOf_rejects_a_null_response()
    {
        await Assert.ThrowsAsync<ArgumentNullException>(async () => await ResponseWrapperStream.TakeOwnershipOf(null!));
    }

    [Fact]
    public async Task Stream_capabilities_are_delegated_to_the_content_stream()
    {
        var (response, _) = DisposeTrackingContent.Response("hello worlds");

        using Stream stream = await ResponseWrapperStream.TakeOwnershipOf(response);

        // A buffered response hands out a seekable stream, and ASP.NET reads CanSeek/Length off the stream
        // returned from these clients to set Content-Length on a file result.
        stream.CanRead.Should().BeTrue();
        stream.CanSeek.Should().BeTrue();
        stream.Length.Should().Be("hello worlds".Length);

        using MemoryStream destination = new();
        await stream.CopyToAsync(destination);
        destination.ToArray().Should().Equal("hello worlds"u8.ToArray());

        stream.Seek(0, SeekOrigin.Begin);
        stream.Position.Should().Be(0);
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
