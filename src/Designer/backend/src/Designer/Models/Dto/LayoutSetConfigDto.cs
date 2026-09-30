#nullable disable
using System.Linq;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// Shared wire model for a layout set, returned to the frontend for both legacy (v8) and v9 apps.
/// The frontend uses a single <c>taskId</c>. Legacy stores it as the <c>tasks</c> array
/// (see <see cref="LayoutSetConfig"/>); v9 derives the task from the layout set id, so <c>taskId</c>
/// is omitted and the frontend falls back to <c>id</c>.
/// </summary>
public class LayoutSetConfigDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; }

    [JsonPropertyName("dataType")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string DataType { get; set; }

    [JsonPropertyName("taskId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string TaskId { get; set; }

    [JsonPropertyName("type")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string Type { get; set; }

    public static LayoutSetConfigDto From(LayoutSetConfig config) =>
        new()
        {
            Id = config.Id,
            DataType = config.DataType,
            TaskId = config.Tasks?.FirstOrDefault(),
            Type = config.Type,
        };

    public static LayoutSetConfigDto From(UiFolderLayoutSetDto layoutSet) =>
        new()
        {
            Id = layoutSet.Id,
            DataType = layoutSet.DataType,
            Type = layoutSet.Type,
        };

    public LayoutSetConfig ToLayoutSetConfig() =>
        new()
        {
            Id = Id,
            DataType = DataType,
            Tasks = TaskId != null ? [TaskId] : null,
            Type = Type,
        };
}
