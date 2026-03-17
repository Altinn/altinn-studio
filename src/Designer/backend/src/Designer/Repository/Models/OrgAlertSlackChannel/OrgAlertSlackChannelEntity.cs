using System;
using System.Collections.Generic;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Repository.Models.OrgAlertSlackChannel;

public class OrgAlertSlackChannelEntity
{
    public Guid Id { get; set; }
    public required string Org { get; set; }
    public required string ChannelName { get; set; }
    public required string SlackId { get; set; }
    public AlertSeverity Severity { get; set; }
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public List<string>? Services { get; set; }
}
