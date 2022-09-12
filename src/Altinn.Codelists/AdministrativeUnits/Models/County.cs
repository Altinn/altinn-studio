using System.Text.Json.Serialization;

namespace Altinn.Codelists.AdministrativeUnits.Models
{
    public class County
    {
        public County(string number, string name)
        {
            Number = number;
            Name = name;
        }

        [JsonPropertyName("fylkesnummer")]
        public string Number { get; set; }

        [JsonPropertyName("fylkesnavn")]
        public string Name { get; set; }

        [JsonPropertyName("kommuner")]
        public List<Commune> Communes { get; set; } = new List<Commune>();
    }
}
