using System.Text.Json.Serialization;

namespace Altinn.Studio.Gateway.Api.Clients.AlertsClient.Contracts;

internal sealed class GrafanaAlertRule
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

internal sealed class GrafanaAnnotations
{
    [JsonPropertyName("__dashboardUid__")]
    public string? DashboardUid { get; set; }

    [JsonPropertyName("__panelId__")]
    public string? PanelId { get; set; }

    [JsonPropertyName("summary")]
    public string? Summary { get; set; }

    [JsonPropertyName("ruleId")]
    public string? RuleId { get; set; }
}

internal sealed class GrafanaLabels
{
    [JsonPropertyName("Type")]
    public string? Type { get; set; }
}
