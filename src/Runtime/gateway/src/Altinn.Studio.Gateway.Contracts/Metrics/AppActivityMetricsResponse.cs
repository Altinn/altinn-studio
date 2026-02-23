namespace Altinn.Studio.Gateway.Contracts.Metrics;

public class AppActivityMetricsResponse
{
    public required string Status { get; set; }
    public required IReadOnlyDictionary<string, double> ActiveAppRequestCounts { get; set; }
    public required int WindowDays { get; set; }
    public required DateTimeOffset GeneratedAt { get; set; }
}
