namespace Altinn.Studio.Gateway.Contracts.Alerts;

public class AlertPayload
{
    public required string Status { get; set; }
    public required IEnumerable<AlertPayloadInstance> Alerts { get; init; }
}

public class AlertPayloadInstance
{
    public required string Status { get; set; }
    public required Dictionary<string, string> Labels { get; init; }
    public required Dictionary<string, string> Annotations { get; init; }
    public required string Fingerprint { get; set; }
    public required DateTimeOffset StartsAt { get; set; }
    public required Uri GeneratorURL { get; set; }
}
