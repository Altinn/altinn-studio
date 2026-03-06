using System;
using System.Collections.Concurrent;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Services.Altinity;

/// <summary>
/// Temporary in-memory store for attachments uploaded before a workflow is started.
/// Entries are keyed by an attachment ID and expire after the workflow is dispatched.
/// </summary>
public sealed class AltinityAttachmentStore
{
    public sealed record StoredAttachment(string Name, string MimeType, long Size, string DataBase64);

    private readonly ConcurrentDictionary<string, StoredAttachment> _attachments = new();

    public string Store(StoredAttachment attachment)
    {
        var id = Guid.NewGuid().ToString("N");
        _attachments[id] = attachment;
        return id;
    }

    public bool TryGet(string id, out StoredAttachment? attachment) => _attachments.TryGetValue(id, out attachment);

    public IReadOnlyList<StoredAttachment> ClaimAll(IEnumerable<string> ids)
    {
        var result = new List<StoredAttachment>();
        foreach (var id in ids)
        {
            if (_attachments.TryRemove(id, out var attachment))
            {
                result.Add(attachment);
            }
        }

        return result;
    }
}
