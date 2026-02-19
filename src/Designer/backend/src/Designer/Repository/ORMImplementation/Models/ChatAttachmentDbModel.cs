using System;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public class ChatAttachmentDbModel
{
    /// <summary>
    /// Unique identifier for the attachment.
    /// </summary>
    public long Id { get; set; }

    /// <summary>
    /// Foreign key for message where attachment belongs.
    /// </summary>
    public long MessageId { get; set; }

    /// <summary>
    /// Attachment file name with extension.
    /// </summary>
    public string FileName { get; set; }

    /// <summary>
    /// Creation timestamp.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// File type.
    /// </summary>
    public string MimeType { get; set; }

    /// <summary>
    /// File size in bytes.
    /// </summary>
    public long SizeBytes { get; set; }

    /// <summary>
    /// Reference to Azure Blob Storage.
    /// </summary>
    public string BlobStorageKey { get; set; }
}
