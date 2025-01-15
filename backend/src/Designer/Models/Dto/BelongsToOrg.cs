using System.Text.Json.Serialization;

public class BelongsToOrgDto
{
    [JsonPropertyName("belongsToOrg")]
    public bool BelongsToOrg { get; set; }
}
