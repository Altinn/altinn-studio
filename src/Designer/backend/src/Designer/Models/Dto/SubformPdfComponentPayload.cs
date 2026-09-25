using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class SubformPdfComponentPayload
{
    [Required]
    [JsonPropertyName("componentId")]
    public string ComponentId { get; set; } = string.Empty;

    [Required]
    [JsonPropertyName("sourceLayoutSetId")]
    public string SourceLayoutSetId { get; set; } = string.Empty;
}
