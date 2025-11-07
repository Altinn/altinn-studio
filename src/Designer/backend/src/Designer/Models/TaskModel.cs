#nullable disable
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models;

public class TaskModel
{
    [JsonPropertyName("id")]
    public string Id { get; set; }
    [JsonPropertyName("type")]
    public string Type { get; set; }
}

