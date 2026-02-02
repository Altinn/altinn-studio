namespace StudioGateway.Api.Clients.Designer.Contracts;

internal sealed class Alert
{
    public required string? Id { get; init; }
    public required string Name { get; init; }
    public required IEnumerable<AlertInstance> Alerts { get; init; }
    public required Uri URL { get; set; }
}

internal sealed class AlertInstance
{
    public required string Status { get; init; }
    public required string App { get; init; }
}
