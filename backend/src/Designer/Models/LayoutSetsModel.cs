using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models;

public class LayoutSetsModel
{
    [JsonPropertyName("sets")]
    public List<LayoutSetModel> Sets { get; set; } = [];
}
