using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Dto;

public class OrgAlertSlackChannelRequest
{
    public required string ChannelName { get; set; }
    public required string SlackId { get; set; }
    public AlertSeverity Severity { get; set; }
    public bool IsActive { get; set; }
    public List<string>? Services { get; set; }
}
