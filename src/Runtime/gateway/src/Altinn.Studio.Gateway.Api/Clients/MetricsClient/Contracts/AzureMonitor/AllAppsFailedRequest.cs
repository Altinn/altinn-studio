namespace Altinn.Studio.Gateway.Api.Clients.MetricsClient.Contracts.AzureMonitor;

internal sealed class AllAppsFailedRequest
{
    public required string AppName { get; set; }
    public required string Name { get; set; }
    public required IEnumerable<long> Timestamps { get; set; }
    public required IEnumerable<double> Counts { get; set; }

    /// <summary>
    /// The count for the whole time range. It is the sum of <see cref="Counts"/> only for a kind that counts
    /// requests, since one instance can fail in several bins.
    /// </summary>
    public required double Count { get; set; }
}
