namespace StudioGateway.Api.Models.Alerts;

public record GrafanaAlert
{
    public GrafanaAlert() { }

    public Dictionary<string, string>? Labels { get; init; }
    public Dictionary<string, string>? Annotations { get; init; }
    public string? GeneratorURL { get; init; }
    public string? Fingerprint { get; init; }
}
