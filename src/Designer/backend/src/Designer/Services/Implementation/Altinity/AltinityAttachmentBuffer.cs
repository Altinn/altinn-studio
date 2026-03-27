using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading;

namespace Altinn.Studio.Designer.Services.Implementation.Altinity;

/// <summary>
/// Temporary in-memory buffer for attachments uploaded before a workflow is started.
/// Entries are keyed by an attachment ID and automatically evicted after a TTL.
/// </summary>
public sealed class AltinityAttachmentBuffer : IDisposable
{
    private static readonly TimeSpan DefaultTtl = TimeSpan.FromMinutes(30);
    private static readonly TimeSpan EvictionInterval = TimeSpan.FromMinutes(5);

    public sealed record StoredAttachment(string Name, string MimeType, long Size, string DataBase64);

    private sealed record BufferEntry(StoredAttachment Attachment, DateTimeOffset StoredAt);

    private readonly ConcurrentDictionary<string, BufferEntry> _entries = new();
    private readonly TimeSpan _ttl;
    private readonly Timer _evictionTimer;

    public AltinityAttachmentBuffer()
        : this(DefaultTtl) { }

    public AltinityAttachmentBuffer(TimeSpan ttl)
    {
        _ttl = ttl;
        _evictionTimer = new Timer(_ => EvictExpired(), null, EvictionInterval, EvictionInterval);
    }

    public string Store(StoredAttachment attachment)
    {
        var id = Guid.NewGuid().ToString("N");
        _entries[id] = new BufferEntry(attachment, DateTimeOffset.UtcNow);
        return id;
    }

    public bool TryGet(string id, out StoredAttachment? attachment)
    {
        if (_entries.TryGetValue(id, out var entry) && !IsExpired(entry))
        {
            attachment = entry.Attachment;
            return true;
        }

        attachment = null;
        return false;
    }

    public IReadOnlyList<StoredAttachment> PeekAll(IEnumerable<string> ids)
    {
        var result = new List<StoredAttachment>();
        foreach (var id in ids)
        {
            if (_entries.TryGetValue(id, out var entry) && !IsExpired(entry))
            {
                result.Add(entry.Attachment);
            }
        }

        return result;
    }

    public void RemoveAll(IEnumerable<string> ids)
    {
        foreach (var id in ids)
        {
            _entries.TryRemove(id, out _);
        }
    }

    public void Dispose()
    {
        _evictionTimer.Dispose();
    }

    private bool IsExpired(BufferEntry entry) => DateTimeOffset.UtcNow - entry.StoredAt > _ttl;

    private void EvictExpired()
    {
        foreach (var kvp in _entries)
        {
            if (IsExpired(kvp.Value))
            {
                _entries.TryRemove(kvp.Key, out _);
            }
        }
    }
}
