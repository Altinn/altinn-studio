using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Services.Models;

public class ProcessDataType
{
    [JsonPropertyName("dataTypeId")]
    public required string DataTypeId { get; set; }

    [JsonPropertyName("taskId")]
    public required string TaskId { get; set; }

    [JsonPropertyName("tag")]
    public required string Tag { get; set; }
}
