using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Implementation.Assistant;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Internal;
using Microsoft.Extensions.Options;
using Xunit;

namespace Designer.Tests.Services;

public class AssistantAttachmentBufferTests
{
    private const string Developer = "testUser";

    private readonly FakeClock _clock = new();
    private readonly MemoryDistributedCache _cache;

    public AssistantAttachmentBufferTests()
    {
        _cache = new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions { Clock = _clock }));
    }

    private static AssistantAttachmentBuffer.StoredAttachment CreateAttachment(string name = "test.pdf") =>
        new(name, "image/png", 1024, "data:image/png;base64,iVBO+w0K/Gg==");

    [Fact]
    public async Task Store_ReturnsUniqueId()
    {
        var buffer = new AssistantAttachmentBuffer(_cache);

        string id1 = await buffer.Store(Developer, CreateAttachment("a.pdf"));
        string id2 = await buffer.Store(Developer, CreateAttachment("b.pdf"));

        Assert.NotEqual(id1, id2);
        Assert.False(string.IsNullOrWhiteSpace(id1));
    }

    [Fact]
    public async Task Get_ReturnsAttachmentStoredByAnotherReplica()
    {
        var uploadReplica = new AssistantAttachmentBuffer(_cache);
        var hubReplica = new AssistantAttachmentBuffer(_cache);
        var attachment = CreateAttachment();

        string id = await uploadReplica.Store(Developer, attachment);
        var result = await hubReplica.Get(Developer, id);

        Assert.Equal(attachment, result);
    }

    [Fact]
    public async Task Get_ReturnsNull_ForUnknownId()
    {
        var buffer = new AssistantAttachmentBuffer(_cache);

        var result = await buffer.Get(Developer, "nonexistent");

        Assert.Null(result);
    }

    [Fact]
    public async Task Get_ReturnsNull_ForAnotherDevelopersAttachment()
    {
        var buffer = new AssistantAttachmentBuffer(_cache);
        string id = await buffer.Store(Developer, CreateAttachment());

        var result = await buffer.Get("otherUser", id);

        Assert.Null(result);
    }

    [Fact]
    public async Task Get_ReturnsNull_AfterLifetime()
    {
        var buffer = new AssistantAttachmentBuffer(_cache);
        string id = await buffer.Store(Developer, CreateAttachment());

        _clock.UtcNow += TimeSpan.FromMinutes(29);
        Assert.NotNull(await buffer.Get(Developer, id));

        _clock.UtcNow += TimeSpan.FromMinutes(2);
        Assert.Null(await buffer.Get(Developer, id));
    }

    [Fact]
    public async Task Remove_RemovesOnlyGivenIds()
    {
        var buffer = new AssistantAttachmentBuffer(_cache);
        string removedId = await buffer.Store(Developer, CreateAttachment("a.pdf"));
        string keptId = await buffer.Store(Developer, CreateAttachment("b.pdf"));

        await buffer.Remove(Developer, [removedId]);

        Assert.Null(await buffer.Get(Developer, removedId));
        Assert.NotNull(await buffer.Get(Developer, keptId));
    }

    private sealed class FakeClock : ISystemClock
    {
        public DateTimeOffset UtcNow { get; set; } = DateTimeOffset.UtcNow;
    }
}
