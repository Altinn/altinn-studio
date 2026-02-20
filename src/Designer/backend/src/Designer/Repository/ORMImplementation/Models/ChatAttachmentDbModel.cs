using System;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public class ChatAttachmentDbModel
{
    /// <summary>
    /// Unique identifier for the attachment.
    /// </summary>
    public long Id { get; set; }

    /// <summary>
    /// External identifier exposed to clients.
    /// </summary>
    public required Guid ExternalId { get; set; }

    /// <summary>
    /// Foreign key for message where attachment belongs.
    /// </summary>
    public long MessageId { get; set; }

    /// <summary>
    /// Attachment file name with extension.
    /// </summary>
    public required string FileName { get; set; }

    /// <summary>
    /// Creation timestamp.
    /// </summary>
    public required DateTime CreatedAt { get; set; }

    /// <summary>
    /// File type.
    /// </summary>
    public required string MimeType { get; set; }

    /// <summary>
    /// File size in bytes.
    /// </summary>
    public required long SizeBytes { get; set; }

    /// <summary>
    /// Reference to Azure Blob Storage.
    /// </summary>
    public required string BlobStorageKey { get; set; }
}
