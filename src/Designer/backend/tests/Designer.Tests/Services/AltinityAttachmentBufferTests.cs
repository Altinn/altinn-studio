using System.Linq;
using Altinn.Studio.Designer.Services.Altinity;
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
    public void ClaimAll_ReturnsAndRemovesMatchingAttachments()
    {
        var buffer = new AltinityAttachmentBuffer();
        var id1 = buffer.Store(CreateAttachment("a.pdf"));
        var id2 = buffer.Store(CreateAttachment("b.pdf"));
        var id3 = buffer.Store(CreateAttachment("c.pdf"));

        var claimed = buffer.ClaimAll(new[] { id1, id3 });

        Assert.Equal(2, claimed.Count);
        Assert.Contains(claimed, a => a.Name == "a.pdf");
        Assert.Contains(claimed, a => a.Name == "c.pdf");

        // Claimed items should be removed
        Assert.False(buffer.TryGet(id1, out _));
        Assert.False(buffer.TryGet(id3, out _));

        // Unclaimed item should still exist
        Assert.True(buffer.TryGet(id2, out _));
    }

    [Fact]
    public void ClaimAll_IgnoresUnknownIds()
    {
        var buffer = new AltinityAttachmentBuffer();
        var id = buffer.Store(CreateAttachment());

        var claimed = buffer.ClaimAll(new[] { id, "unknown-id" });

        Assert.Single(claimed);
    }

    [Fact]
    public void ClaimAll_CannotClaimSameAttachmentTwice()
    {
        var buffer = new AltinityAttachmentBuffer();
        var id = buffer.Store(CreateAttachment());

        var first = buffer.ClaimAll(new[] { id });
        var second = buffer.ClaimAll(new[] { id });

        Assert.Single(first);
        Assert.Empty(second);
    }
}
