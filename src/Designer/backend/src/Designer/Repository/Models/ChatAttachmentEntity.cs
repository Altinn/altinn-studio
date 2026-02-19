#nullable disable
using System;

namespace Altinn.Studio.Designer.Repository.Models;

public class ChatAttachmentEntity
{
    public long Id { get; set; }
    public long MessageId { get; set; }
    public string FileName { get; set; }
    public DateTime CreatedAt { get; set; }
    public string MimeType { get; set; }
    public long SizeBytes { get; set; }
    public string BlobStorageKey { get; set; }
}
