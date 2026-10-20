namespace Altinn.Studio.Gateway.Api.Clients.MetricsClient;

internal sealed record AppActivitySignalRow(string App, string Category, double Count, DateTimeOffset LastSeenAt);

internal sealed class AppActivitySignalsResult
{
    public required ActivityStatus Status { get; init; }
    public required IReadOnlyList<AppActivitySignalRow> Signals { get; init; }
}
