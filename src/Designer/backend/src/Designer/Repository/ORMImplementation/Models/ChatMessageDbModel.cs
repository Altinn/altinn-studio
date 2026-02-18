using System;
using System.Collections.Generic;

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
    public ActionMode ActionMode  { get; set; }

    /// <summary>
    /// List of app files changed by assistant.
    /// </summary>
    public List<string>? FilesChanged { get; set; }
}

public enum Role
{
    User = 0,
    Assistant = 1
}

public enum ActionMode
{
    Auto = 0,
    Ask = 1,
    Edit = 2,
}
