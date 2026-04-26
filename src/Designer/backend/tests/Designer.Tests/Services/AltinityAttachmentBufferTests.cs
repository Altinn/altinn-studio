using System;
using System.Linq;
using System.Threading;
using Altinn.Studio.Designer.Services.Implementation.Altinity;
using Xunit;

namespace Designer.Tests.Services;

public class AltinityAttachmentBufferTests
{
    private static AltinityAttachmentBuffer.StoredAttachment CreateAttachment(string name = "test.pdf") =>
        new(name, "application/pdf", 1024, "data:application/pdf;base64,dGVzdA==");

    [Fact]
    public void Store_ReturnsUniqueId()
    {
        var buffer = new AltinityAttachmentBuffer();
        var id1 = buffer.Store(CreateAttachment("a.pdf"));
        var id2 = buffer.Store(CreateAttachment("b.pdf"));

        Assert.NotEqual(id1, id2);
        Assert.False(string.IsNullOrWhiteSpace(id1));
    }

    [Fact]
    public void TryGet_ReturnsStoredAttachment()
    {
        var buffer = new AltinityAttachmentBuffer();
        var attachment = CreateAttachment();
        var id = buffer.Store(attachment);

        var found = buffer.TryGet(id, out var result);

        Assert.True(found);
        Assert.Equal(attachment.Name, result!.Name);
        Assert.Equal(attachment.MimeType, result.MimeType);
        Assert.Equal(attachment.Size, result.Size);
    }

    [Fact]
    public void TryGet_ReturnsFalse_ForUnknownId()
    {
        var buffer = new AltinityAttachmentBuffer();

        var found = buffer.TryGet("nonexistent", out var result);

        Assert.False(found);
        Assert.Null(result);
    }

    [Fact]
    public void PeekAll_ReturnsMatchingAttachments_WithoutRemoving()
    {
        var buffer = new AltinityAttachmentBuffer();
        var id1 = buffer.Store(CreateAttachment("a.pdf"));
        var id2 = buffer.Store(CreateAttachment("b.pdf"));
        var id3 = buffer.Store(CreateAttachment("c.pdf"));

        var peeked = buffer.PeekAll(new[] { id1, id3 });

        Assert.Equal(2, peeked.Count);
        Assert.Contains(peeked, a => a.Name == "a.pdf");
        Assert.Contains(peeked, a => a.Name == "c.pdf");

        // Peeked items should still exist
        Assert.True(buffer.TryGet(id1, out _));
        Assert.True(buffer.TryGet(id3, out _));
        Assert.True(buffer.TryGet(id2, out _));
    }

    [Fact]
    public void PeekAll_IgnoresUnknownIds()
    {
        var buffer = new AltinityAttachmentBuffer();
        var id = buffer.Store(CreateAttachment());

        var peeked = buffer.PeekAll(new[] { id, "unknown-id" });

        Assert.Single(peeked);
    }

    [Fact]
    public void RemoveAll_RemovesSpecifiedEntries()
    {
        var buffer = new AltinityAttachmentBuffer();
        var id1 = buffer.Store(CreateAttachment("a.pdf"));
        var id2 = buffer.Store(CreateAttachment("b.pdf"));

        buffer.RemoveAll(new[] { id1 });

        Assert.False(buffer.TryGet(id1, out _));
        Assert.True(buffer.TryGet(id2, out _));
    }

    [Fact]
    public void RemoveAll_AfterPeek_CompletesClaimCycle()
    {
        var buffer = new AltinityAttachmentBuffer();
        var id = buffer.Store(CreateAttachment());

        var peeked = buffer.PeekAll(new[] { id });
        Assert.Single(peeked);

        buffer.RemoveAll(new[] { id });
        Assert.False(buffer.TryGet(id, out _));

        // Second peek returns nothing
        var secondPeek = buffer.PeekAll(new[] { id });
        Assert.Empty(secondPeek);
    }

    [Fact]
    public void TryGet_ReturnsFalse_ForExpiredEntry()
    {
        var buffer = new AltinityAttachmentBuffer(TimeSpan.FromMilliseconds(100));
        var id = buffer.Store(CreateAttachment());

        Assert.True(buffer.TryGet(id, out _));

        Thread.Sleep(300);

        Assert.False(buffer.TryGet(id, out _));
    }

    [Fact]
    public void PeekAll_ExcludesExpiredEntries()
    {
        var buffer = new AltinityAttachmentBuffer(TimeSpan.FromMilliseconds(100));
        var id = buffer.Store(CreateAttachment());

        Thread.Sleep(300);

        var peeked = buffer.PeekAll(new[] { id });
        Assert.Empty(peeked);
    }
}
