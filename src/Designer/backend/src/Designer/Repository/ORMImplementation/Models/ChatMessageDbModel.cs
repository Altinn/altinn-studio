#nullable disable
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
    /// Foreign key for thread where message belongs.
    /// </summary>
    public long ThreadId { get; set; }

    /// <summary>
    /// Creation timestamp.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Message author role.
    /// </summary>
    public Role Role { get; set; }

    /// <summary>
    /// Message main content.
    /// </summary>
    public string Content { get; set; }

    /// <summary>
    /// Assistant action mode, set by the user.
    /// </summary>
    public ActionMode ActionMode { get; set; }

    /// <summary>
    /// List of app files changed by assistant.
    /// </summary>
    public List<string> FilesChanged { get; set; }
}
