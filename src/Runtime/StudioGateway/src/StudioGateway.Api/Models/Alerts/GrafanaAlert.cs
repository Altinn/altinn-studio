namespace StudioGateway.Api.Models.Alerts;

public record GrafanaAlert(
    Dictionary<string, string> Labels,
    Dictionary<string, string> Annotations,
    string GeneratorURL,
    string Fingerprint);
