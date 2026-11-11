using System;
using System.Collections.Generic;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Distributed;

namespace Altinn.Studio.Designer.Services.Implementation.Assistant;

/// <summary>
/// Keeps the attachments a developer uploads until the workflow that uses them starts.
/// The attachments are in the distributed cache, because the upload and the SignalR connection that starts the
/// workflow can reach different replicas.
/// </summary>
public sealed class AssistantAttachmentBuffer(IDistributedCache cache)
{
    private const string CacheKeyPrefix = "assistant-attachment:";

    // The frontend starts the workflow right after the upload. The margin covers a start that waits, such as when
    // many developers use the assistant at once.
    private static readonly TimeSpan s_lifetime = TimeSpan.FromMinutes(30);

    // The default encoder writes each '+' in the base64 data as six characters, and the value is never written into
    // HTML.
    private static readonly JsonSerializerOptions s_serializerOptions = new()
    {
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    /// <summary>
    /// An uploaded file, with its content as a data URL.
    /// </summary>
    public sealed record StoredAttachment(string Name, string MimeType, long Size, string DataBase64);

    /// <summary>
    /// Stores an attachment for a developer.
    /// </summary>
    /// <returns>The ID that the developer starts a workflow with.</returns>
    public async Task<string> Store(
        string developer,
        StoredAttachment attachment,
        CancellationToken cancellationToken = default
    )
    {
        string id = Guid.NewGuid().ToString("N");
        await cache.SetAsync(
            CacheKey(developer, id),
            JsonSerializer.SerializeToUtf8Bytes(attachment, s_serializerOptions),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = s_lifetime },
            cancellationToken
        );
        return id;
    }

    /// <summary>
    /// Gets an attachment that the developer stored.
    /// </summary>
    /// <returns>The attachment, or null when it has expired or belongs to another developer.</returns>
    public async Task<StoredAttachment?> Get(string developer, string id, CancellationToken cancellationToken = default)
    {
        byte[]? value = await cache.GetAsync(CacheKey(developer, id), cancellationToken);
        return value is null ? null : JsonSerializer.Deserialize<StoredAttachment>(value, s_serializerOptions);
    }

    /// <summary>
    /// Removes the developer's attachments with the given IDs.
    /// </summary>
    public async Task Remove(string developer, IEnumerable<string> ids, CancellationToken cancellationToken = default)
    {
        foreach (string id in ids)
        {
            await cache.RemoveAsync(CacheKey(developer, id), cancellationToken);
        }
    }

    private static string CacheKey(string developer, string id) => $"{CacheKeyPrefix}{developer}:{id}";
}
