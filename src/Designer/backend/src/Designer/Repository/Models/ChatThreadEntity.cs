#nullable disable
using System;

namespace Altinn.Studio.Designer.Repository.Models;

public class ChatThreadEntity
{
    public long Id { get; set; }
    public string Title { get; set; }
    public string Org { get; set; }
    public string App { get; set; }
    public string CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}
