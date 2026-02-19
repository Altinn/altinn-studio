#nullable disable
using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Repository.Models;

public class ChatMessageEntity
{
    public long Id { get; set; }
    public long ThreadId { get; set; }
    public DateTime CreatedAt { get; set; }
    public Role Role { get; set; }
    public string Content { get; set; }
    public ActionMode ActionMode { get; set; }
    public List<string> FilesChanged { get; set; }
    public List<ChatAttachmentEntity> Attachments { get; set; }
}

public enum Role { User = 0, Assistant = 1 }
public enum ActionMode { Auto = 0, Ask = 1, Edit = 2 }
