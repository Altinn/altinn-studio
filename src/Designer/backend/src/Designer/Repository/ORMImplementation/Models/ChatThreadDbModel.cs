#nullable disable
using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public class ChatThreadDbModel
{
    /// <summary>
    /// Unique identifier for the chat thread.
    /// </summary>
    public long Id { get; set; }

    /// <summary>
    /// Org that owns the thread.
    /// </summary>
    public string Org { get; set; }

    /// <summary>
    /// App where the thread resides.
    /// </summary>
    public string App { get; set; }

    /// <summary>
    /// User who created the thread.
    /// </summary>
    public string CreatedBy { get; set; }

    /// <summary>
    /// Thread title. AI generated or set by user.
    /// </summary>
    public string Title { get; set; }

    /// <summary>
    /// Thread creation timestamp.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Navigation property for messages.
    /// </summary>
    public List<ChatMessageDbModel> Messages { get; set; }
}

