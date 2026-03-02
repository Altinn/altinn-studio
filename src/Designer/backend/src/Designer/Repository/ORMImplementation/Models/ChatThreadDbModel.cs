using System;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public class ChatThreadDbModel
{
    /// <summary>
    /// Unique identifier for the chat thread.
    /// </summary>
    public Guid Id { get; set; } = Guid.CreateVersion7();

    /// <summary>
    /// Org that owns the thread.
    /// </summary>
    public required string Org { get; set; }

    /// <summary>
    /// App where the thread resides.
    /// </summary>
    public required string App { get; set; }

    /// <summary>
    /// User who created the thread.
    /// </summary>
    public required string CreatedBy { get; set; }

    /// <summary>
    /// Thread title.
    /// </summary>
    public required string Title { get; set; }

    /// <summary>
    /// Thread creation timestamp.
    /// </summary>
    public required DateTime CreatedAt { get; set; }
}
