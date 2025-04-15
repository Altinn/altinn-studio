#nullable enable
using System.Collections.Generic;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Converters;

namespace Altinn.Studio.Designer.Models;

public class LayoutSets : Altinn.App.Core.Models.LayoutSets
{
    [JsonPropertyName("$schema")]
    public string? Schema { get; set; }

    [JsonPropertyName("sets")]
    public new required List<LayoutSetConfig> Sets { get; set; }

    [JsonPropertyName("uiSettings")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public UiSettings? UiSettings { get; set; }

    [JsonExtensionData]
    public IDictionary<string, object?>? UnknownProperties { get; set; }
}

public class LayoutSetConfig
{
    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("dataType")] public string? DataType { get; set; }

    [JsonPropertyName("tasks")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<string>? Tasks { get; set; }

    [JsonPropertyName("type")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Type { get; set; }

    [JsonExtensionData]
    public IDictionary<string, object?>? UnknownProperties { get; set; }
}

public class UiSettings
{
    [JsonPropertyName("taskNavigation")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public IEnumerable<TaskNavigationGroup>? TaskNavigation { get; set; }

    [JsonExtensionData]
    public IDictionary<string, object?>? UnknownProperties { get; set; }
}

[JsonConverter(typeof(TaskNavigationGroupJsonConverter))]
public abstract class TaskNavigationGroup
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }
}

public class TaskNavigationTask : TaskNavigationGroup
{
    [JsonPropertyName("taskId")]
    public string? TaskId { get; set; }
}

public class TaskNavigationReceipt : TaskNavigationGroup
{
    [JsonPropertyName("type")]
    public TaskNavigationReceiptType? Type { get; set; }
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum TaskNavigationReceiptType
{
    [JsonStringEnumMemberName("receipt")]
    Receipt
}
