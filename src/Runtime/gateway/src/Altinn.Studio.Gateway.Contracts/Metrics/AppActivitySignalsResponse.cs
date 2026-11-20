namespace Altinn.Studio.Gateway.Contracts.Metrics;

public class AppActivitySignalsResponse
{
    public required string Status { get; set; }
    public required int WindowDays { get; set; }
    public required DateTimeOffset GeneratedAt { get; set; }
    public required IReadOnlyList<AppActivitySignalsApp> Apps { get; set; }
}

public class AppActivitySignalsApp
{
    public required string App { get; set; }
    public required IReadOnlyList<AppActivitySignal> Signals { get; set; }
}

public class AppActivitySignal
{
    public required string Category { get; set; }
    public required double Count { get; set; }
    public required DateTimeOffset LastSeenAt { get; set; }
}
