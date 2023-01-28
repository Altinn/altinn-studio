using System.Text.Json.Serialization;

namespace Altinn.Codelists.SSB.Clients;

/// <summary>
/// List of classification codes from a specified classification.
/// </summary>
public class ClassificationCodes
{
    /// <summary>
    /// List of codes for a given classification.
    /// </summary>
    [JsonPropertyName("codes")]
    public List<ClassificationCode> Codes { get; set; } = new List<ClassificationCode>();
}
