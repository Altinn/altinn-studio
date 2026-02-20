using System;

namespace Altinn.Studio.Designer.Repository.Models;

public class ChatAttachmentEntity
{
    public required long Id { get; set; }
    public required long MessageId { get; set; }
    public required string FileName { get; set; }
    public required DateTime CreatedAt { get; set; }
    public required string MimeType { get; set; }
    public required long SizeBytes { get; set; }
    public required string BlobStorageKey { get; set; }
}
