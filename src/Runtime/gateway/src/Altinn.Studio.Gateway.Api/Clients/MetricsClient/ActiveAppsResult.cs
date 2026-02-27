namespace Altinn.Studio.Gateway.Api.Clients.MetricsClient;

internal enum ActivityStatus
{
    Ok,
    Unavailable,
    Error,
}

internal sealed class ActiveAppsResult
{
    public required ActivityStatus Status { get; init; }
    public required IReadOnlyDictionary<string, double> ActiveAppRequestCounts { get; init; }
}
