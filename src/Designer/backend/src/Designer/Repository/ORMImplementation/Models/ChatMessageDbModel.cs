using System;
using System.Collections.Generic;
using Altinn.Studio.Designer.Repository.Models;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public class ChatMessageDbModel
{
    /// <summary>
    /// Unique identifier for the message.
    /// </summary>
    public Guid Id { get; set; } = Guid.CreateVersion7();

    /// <summary>
    /// Foreign key for thread where message belongs.
    /// </summary>
    public Guid ThreadId { get; set; }

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
    public ActionMode? ActionMode { get; set; }

    /// <summary>
    /// Names of attached files.
    /// </summary>
    public List<string>? AttachmentFileNames { get; set; }

    /// <summary>
    /// App files changed by assistant.
    /// </summary>
    public List<string>? FilesChanged { get; set; }
}
