using System.Text.Json.Serialization;

namespace Altinn.Codelists.AdministrativeUnits.Models
{
    public class Commune
    {
        public Commune(string number, string name, string nameInNorwegian)
        {
            Number = number;
            Name = name;
            NameInNorwegian = nameInNorwegian;
        }

        [JsonPropertyName("kommunenummer")]
        public string Number { get; set; }

        [JsonPropertyName("kommunenavn")]
        public string Name { get; set; }

        [JsonPropertyName("kommunenavnNorsk")]
        public string NameInNorwegian { get; set; }
    }
}
