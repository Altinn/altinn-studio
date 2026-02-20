using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Repository.Models;

public class ChatMessageEntity
{
    public required long Id { get; set; }
    public required long ThreadId { get; set; }
    public required DateTime CreatedAt { get; set; }
    public required Role Role { get; set; }
    public required string Content { get; set; }
    public required ActionMode ActionMode { get; set; }
    public List<string> FilesChanged { get; set; } = [];
    public List<ChatAttachmentEntity> Attachments { get; set; } = [];
}

public enum Role { User = 0, Assistant = 1 }
public enum ActionMode { Auto = 0, Ask = 1, Edit = 2 }
