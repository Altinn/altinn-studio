using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Metrics;

public class MetricsResponse
{
    public required string SubscriptionId { get; set; }
    public required IEnumerable<Metric> Metrics { get; set; }
}
