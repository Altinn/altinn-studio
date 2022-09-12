using System.Text.Json.Serialization;

namespace Altinn.Codelists.SSB.Models
{
    public class ClassificationCode
    {
        public ClassificationCode(string code, string level, string name)
        {
            Code = code;
            Level = level;
            Name = name;
        }

        [JsonPropertyName("code")]
        public string Code { get; set; }

        [JsonPropertyName("parentCode")]
        public string? ParentCode { get; set; } = null;

        [JsonPropertyName("level")]
        public string Level { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; }

        [JsonPropertyName("shortName")]
        public string ShortName { get; set; } = string.Empty;

        [JsonPropertyName("presentationName")]
        public string PresentationName { get; set; } = string.Empty;

        [JsonPropertyName("validFrom")]
        public DateTime? ValidFrom { get; set; }

        [JsonPropertyName("validTo")]
        public DateTime? ValidTo { get; set; }

        [JsonPropertyName("validFromInRequestedRange")]
        public DateTime? ValidFromInRequestedRange { get; set; }

        [JsonPropertyName("validToInRequestedRange")]
        public DateTime? ValidToInRequestedRange { get; set; }

        [JsonPropertyName("notes")]
        public string Notes { get; set; } = string.Empty;
    }
}
