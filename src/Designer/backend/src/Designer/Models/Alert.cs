using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models;

public class Alert
{
    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("type")]
    public required string Type { get; set; }

    [JsonPropertyName("app")]
    public required string App { get; set; }

    [JsonPropertyName("url")]
    public required string Url { get; set; }
}

public record GrafanaAlert(
    Dictionary<string, string> Labels,
    Dictionary<string, string> Annotations,
    string StartsAt,
    string EndsAt,
    string GeneratorURL,
    string Fingerprint,
    GrafanaAlertStatus Status);

public record GrafanaAlertStatus(
    string State,
    string[] SilencedBy,
    string[] InhibitedBy);

//   "receivers": [
//     {
//       "name": "admin"
//     }
//   ],
//   "updatedAt": "2025-10-21T12:15:40.005+02:00",
