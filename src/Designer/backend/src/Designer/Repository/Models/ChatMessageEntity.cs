using System;
using System.Collections.Generic;
using Altinn.Studio.Designer.Enums;

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
