using System.Text.Json.Serialization;

namespace Altinn.Codelists.Countries.Models
{
    public class Currency
    {
        public Currency(string name, string symbol)
        {
            Name = name;
            Symbol = symbol;
        }

        [JsonPropertyName("name")]
        public string Name { get; set; }

        [JsonPropertyName("symbol")]
        public string Symbol { get; set; }
    }
}