using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Repository.Models;

public class ChatMessageEntity
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required DateTime CreatedAt { get; set; }
    public required Role Role { get; set; }
    public required string Content { get; set; }
    public ActionMode? ActionMode { get; set; }
    public List<string>? AttachmentFileNames { get; set; }
    public List<string>? FilesChanged { get; set; }
}

public enum Role
{
    User = 0,
    Assistant = 1,
}

public enum ActionMode
{
    Auto = 0,
    Ask = 1,
    Edit = 2,
}
