using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Services.Models;

public class ProcessDataTypeTag
{
    [JsonPropertyName("dataTypeId")]
    public required string DataTypeId { get; set; }

    [JsonPropertyName("tag")]
    public required string Tag { get; set; }
}
