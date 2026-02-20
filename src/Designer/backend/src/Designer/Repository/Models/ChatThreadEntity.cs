using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Repository.Models;

public class ChatThreadEntity
{
    public required long Id { get; set; }
    public required string Title { get; set; }
    public required string Org { get; set; }
    public required string App { get; set; }
    public required string CreatedBy { get; set; }
    public required DateTime CreatedAt { get; set; }
    public List<ChatMessageEntity> Messages { get; set; } = [];
}
