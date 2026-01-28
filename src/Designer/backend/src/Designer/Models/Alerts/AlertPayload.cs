using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Alerts;

public class Alert
{
    public string? Id { get; init; }
    public required string Name { get; init; }
    public required IEnumerable<AlertInstance> Alerts { get; init; }
    public required Uri URL { get; set; }
}

public class AlertInstance
{
    public required string Status { get; init; }
    public required string App { get; init; }
}
