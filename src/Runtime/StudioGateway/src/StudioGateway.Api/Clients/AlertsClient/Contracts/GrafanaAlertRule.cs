using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

namespace StudioGateway.Api.Clients.AlertsClient.Contracts;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1515:AvoidUninstantiatedPublicTypes",
    Justification = "Exposed externally"
)]
public class GrafanaAlertRule
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("uid")]
    public string? Uid { get; set; }

    [JsonPropertyName("folderUID")]
    public string? FolderUid { get; set; }

    [JsonPropertyName("ruleGroup")]
    public string? RuleGroup { get; set; }

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("updated")]
    public DateTime Updated { get; set; }

    [JsonPropertyName("noDataState")]
    public string? NoDataState { get; set; }

    [JsonPropertyName("execErrState")]
    public string? ExecErrState { get; set; }

    [JsonPropertyName("for")]
    public string? For { get; set; }

    [JsonPropertyName("annotations")]
    public GrafanaAnnotations? Annotations { get; set; }

    [JsonPropertyName("labels")]
    public GrafanaLabels? Labels { get; set; }

    [JsonPropertyName("isPaused")]
    public bool IsPaused { get; set; }
}

[SuppressMessage(
    "Microsoft.Performance",
    "CA1515:AvoidUninstantiatedPublicTypes",
    Justification = "Exposed externally"
)]
public class GrafanaAnnotations
{
    [JsonPropertyName("__dashboardUid__")]
    public string? DashboardUid { get; set; }

    [JsonPropertyName("__panelId__")]
    public string? PanelId { get; set; }

    [JsonPropertyName("summary")]
    public string? Summary { get; set; }
}

[SuppressMessage(
    "Microsoft.Performance",
    "CA1515:AvoidUninstantiatedPublicTypes",
    Justification = "Exposed externally"
)]
public class GrafanaLabels
{
    [JsonPropertyName("RuleId")]
    public string? RuleId { get; set; }

    [JsonPropertyName("Type")]
    public string? Type { get; set; }
}
