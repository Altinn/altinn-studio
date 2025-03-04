using System.Text.Json.Serialization;
namespace Altinn.Studio.Designer.Models.Dto;

public class OrgTemplate
{
    [JsonPropertyName("name")]
    public string Name { get; set; }

    [JsonPropertyName("description")]
    public string Description { get; set; }

    [JsonPropertyName("repositoryName")]
    public string RepositoryName { get; set; }
}
