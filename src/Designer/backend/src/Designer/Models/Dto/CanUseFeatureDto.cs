using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class CanUseFeatureDto
{
    [JsonPropertyName("canUseFeature")] public bool CanUseFeature { get; set; }
}
