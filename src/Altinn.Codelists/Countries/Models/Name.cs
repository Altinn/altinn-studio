using System.Text.Json.Serialization;

namespace Altinn.Codelists.Countries.Models
{
    public class Name
    {
        public Name(string common, string official)
        {
            Common = common;
            Official = official;
        }

        [JsonPropertyName("common")]
        public string Common { get; set; }

        [JsonPropertyName("official")]
        public string Official { get; set; }
    }
}