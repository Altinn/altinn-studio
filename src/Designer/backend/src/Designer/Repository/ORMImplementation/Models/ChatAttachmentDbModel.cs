using System;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public class ChatAttachmentDbModel
{
    /// <summary>
    /// Unique identifier for the attachment.
    /// </summary>
    public required Guid Id { get; set; }

    /// <summary>
    /// Foreign key for message where attachment belongs.
    /// </summary>
    public Guid MessageId { get; set; }

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
