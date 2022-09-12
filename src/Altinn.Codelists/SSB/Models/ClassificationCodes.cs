using System.Text.Json.Serialization;

namespace Altinn.Codelists.SSB.Models
{
    public class ClassificationCodes
    {
        [JsonPropertyName("codes")]
        public List<ClassificationCode> Codes { get; set; } = new List<ClassificationCode>();
    }
}
