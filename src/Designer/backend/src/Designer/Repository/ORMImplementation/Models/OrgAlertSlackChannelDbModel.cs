using System;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public class OrgAlertSlackChannelDbModel
{
    public Guid Id { get; set; }
    public string Org { get; set; } = string.Empty;
    public string ChannelName { get; set; } = string.Empty;
    public string SlackId { get; set; } = string.Empty;
    public AlertSeverity Severity { get; set; }
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public string? Services { get; set; }
}
