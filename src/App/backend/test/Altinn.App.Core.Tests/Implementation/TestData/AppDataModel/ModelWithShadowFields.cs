#nullable disable
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Newtonsoft.Json;

namespace Altinn.App.Core.Tests.Implementation.TestData.AppDataModel;

[XmlRoot(ElementName = "model")]
public class ModelWithShadowFields
{
    [Range(double.MinValue, double.MaxValue)]
    [XmlElement("property1", Order = 1)]
    [JsonProperty("property1")]
    [JsonPropertyName("property1")]
    [Required]
    public decimal? Property1 { get; set; }

    [Range(double.MinValue, double.MaxValue)]
    [XmlElement("property2", Order = 2)]
    [JsonProperty("property2")]
    [JsonPropertyName("property2")]
    [Required]
    public decimal? Property2 { get; set; }

    [XmlElement("property3", Order = 3)]
    [JsonProperty("property3")]
    [JsonPropertyName("property3")]
    public string Property3 { get; set; }

    [XmlElement("AltinnSF_hello", Order = 4)]
    [JsonProperty("AltinnSF_hello")]
    [JsonPropertyName("AltinnSF_hello")]
    public string AltinnSF_hello { get; set; }

    [XmlElement("AltinnSF_test", Order = 5)]
    [JsonProperty("AltinnSF_test")]
    [JsonPropertyName("AltinnSF_test")]
    public string AltinnSF_test { get; set; }

    [XmlElement("AltinnSF_gruppeish", Order = 6)]
    [JsonProperty("AltinnSF_gruppeish")]
    [JsonPropertyName("AltinnSF_gruppeish")]
    public AltinnSF_gruppeish AltinnSF_gruppeish { get; set; }

    [XmlElement("gruppe", Order = 7)]
    [JsonProperty("gruppe")]
    [JsonPropertyName("gruppe")]
    public List<Gruppe> Gruppe { get; set; }
}

public class AltinnSF_gruppeish
{
    [XmlElement("f1", Order = 1)]
    [JsonProperty("f1")]
    [JsonPropertyName("f1")]
    public string F1 { get; set; }

    [XmlElement("f2", Order = 2)]
    [JsonProperty("f2")]
    [JsonPropertyName("f2")]
    public string F2 { get; set; }
}

public class Gruppe
{
    [XmlElement("gf1", Order = 1)]
    [JsonProperty("gf1")]
    [JsonPropertyName("gf1")]
    public string Gf1 { get; set; }

    [XmlElement("AltinnSF_gf-hjelpefelt", Order = 2)]
    [JsonProperty("AltinnSF_gf-hjelpefelt")]
    [JsonPropertyName("AltinnSF_gf-hjelpefelt")]
    public string AltinnSF_gfhjelpefelt { get; set; }
}
