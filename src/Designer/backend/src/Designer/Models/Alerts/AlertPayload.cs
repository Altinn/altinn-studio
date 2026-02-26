using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Alerts;

public class Alert
{
    public required string Id { get; init; }
    public required string RuleId { get; init; }
    public required string Name { get; init; }
    public required IEnumerable<AlertInstance> Alerts { get; init; }
    public required Uri Url { get; init; }
    public required Uri LogsUrl { get; init; }
}

public class AlertInstance
{
    public required string Status { get; init; }
    public required string App { get; init; }
}
