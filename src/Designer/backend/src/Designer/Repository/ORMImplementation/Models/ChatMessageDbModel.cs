using System;
using System.Collections.Generic;
using Altinn.Studio.Designer.Repository.Models;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public class ChatMessageDbModel
{
    /// <summary>
    /// Unique identifier for the message.
    /// </summary>
    public long Id { get; set; }

    /// <summary>
    /// External identifier exposed to clients.
    /// </summary>
    public required Guid ExternalId { get; set; }

    /// <summary>
    /// Foreign key for thread where message belongs.
    /// </summary>
    public long ThreadId { get; set; }

    /// <summary>
    /// Creation timestamp.
    /// </summary>
    public required DateTime CreatedAt { get; set; }

    /// <summary>
    /// Message author role.
    /// </summary>
    public required Role Role { get; set; }

    /// <summary>
    /// Message main content.
    /// </summary>
    public required string Content { get; set; }

    /// <summary>
    /// Assistant action mode, set by the user.
    /// </summary>
    public required ActionMode ActionMode { get; set; }

    /// <summary>
    /// List of app files changed by assistant.
    /// </summary>
    public List<string> FilesChanged { get; set; } = [];

    /// <summary>
    /// Navigation property for attachments.
    /// </summary>
    public List<ChatAttachmentDbModel> Attachments { get; set; } = [];
}
