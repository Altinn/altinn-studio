using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models
{
    public class CustomTemplateList
    {
        [JsonPropertyName("templates")]
        public List<CustomTemplateListObject> Templates { get; set; } = [];

        public int TotalCount => Templates.Count;
    }

    public class CustomTemplateListObject
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("owner")]
        public string Owner { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        public bool IsListable()
        {
            if (string.IsNullOrWhiteSpace(Id) || string.IsNullOrWhiteSpace(Owner))
            {
                return false;
            }

            if (string.IsNullOrWhiteSpace(Name))

            {
                return false;
            }

            return true;
        }
    }
}
