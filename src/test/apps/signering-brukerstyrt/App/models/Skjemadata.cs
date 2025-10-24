#nullable disable
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Newtonsoft.Json;

namespace Altinn.App.Models.Skjemadata
{
    [XmlRoot(ElementName = "Skjemadata")]
    public class Skjemadata
    {
        [XmlElement("Selskapsnavn", Order = 1)]
        [JsonProperty("Selskapsnavn")]
        [JsonPropertyName("Selskapsnavn")]
        public string Selskapsnavn { get; set; }

        [XmlElement("SelskapetsFormaal", Order = 2)]
        [JsonProperty("SelskapetsFormaal")]
        [JsonPropertyName("SelskapetsFormaal")]
        public string SelskapetsFormaal { get; set; }

        [XmlElement("StifterPerson", Order = 3)]
        [JsonProperty("StifterPerson")]
        [JsonPropertyName("StifterPerson")]
        public List<StifterPerson> StifterPerson { get; set; }

        [XmlElement("StifterVirksomhet", Order = 4)]
        [JsonProperty("StifterVirksomhet")]
        [JsonPropertyName("StifterVirksomhet")]
        public List<StifterVirksomhet> StifterVirksomhet { get; set; }

        [XmlElement("Aksjekapital", Order = 5)]
        [JsonProperty("Aksjekapital")]
        [JsonPropertyName("Aksjekapital")]
        public Aksjekapital Aksjekapital { get; set; }

        [XmlElement("Styre", Order = 6)]
        [JsonProperty("Styre")]
        [JsonPropertyName("Styre")]
        public Styre Styre { get; set; }

        [XmlElement("Revisor", Order = 7)]
        [JsonProperty("Revisor")]
        [JsonPropertyName("Revisor")]
        public Revisor Revisor { get; set; }

        [XmlElement("Stiftelsesdokumenter", Order = 8)]
        [JsonProperty("Stiftelsesdokumenter")]
        [JsonPropertyName("Stiftelsesdokumenter")]
        public List<string> Stiftelsesdokumenter { get; set; }
    }

    public class StifterPerson
    {
        [XmlAttribute("altinnRowId")]
        [JsonPropertyName("altinnRowId")]
        [System.Text.Json.Serialization.JsonIgnore(
            Condition = JsonIgnoreCondition.WhenWritingDefault
        )]
        [Newtonsoft.Json.JsonIgnore]
        public Guid AltinnRowId { get; set; }

        public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

        [XmlElement("Fornavn", Order = 1)]
        [JsonProperty("Fornavn")]
        [JsonPropertyName("Fornavn")]
        public string Fornavn { get; set; }

        [XmlElement("Mellomnavn", Order = 2)]
        [JsonProperty("Mellomnavn")]
        [JsonPropertyName("Mellomnavn")]
        public string Mellomnavn { get; set; }

        [XmlElement("Etternavn", Order = 3)]
        [JsonProperty("Etternavn")]
        [JsonPropertyName("Etternavn")]
        public string Etternavn { get; set; }

        [XmlElement("Adresse", Order = 4)]
        [JsonProperty("Adresse")]
        [JsonPropertyName("Adresse")]
        public Adresse Adresse { get; set; }

        [XmlElement("Aksjetegning", Order = 5)]
        [JsonProperty("Aksjetegning")]
        [JsonPropertyName("Aksjetegning")]
        public Aksjetegning Aksjetegning { get; set; }

        [XmlElement("HarFullmektig", Order = 6)]
        [JsonProperty("HarFullmektig")]
        [JsonPropertyName("HarFullmektig")]
        public string HarFullmektig { get; set; }

        [XmlElement("Fullmektig", Order = 7)]
        [JsonProperty("Fullmektig")]
        [JsonPropertyName("Fullmektig")]
        public Fullmektig Fullmektig { get; set; }

        [XmlElement("Foedselsnummer", Order = 8)]
        [JsonProperty("Foedselsnummer")]
        [JsonPropertyName("Foedselsnummer")]
        public string Foedselsnummer { get; set; }

        [XmlElement("Epost", Order = 9)]
        [JsonProperty("Epost")]
        [JsonPropertyName("Epost")]
        public string Epost { get; set; }

        [XmlElement("Mobiltelefon", Order = 10)]
        [JsonProperty("Mobiltelefon")]
        [JsonPropertyName("Mobiltelefon")]
        public string Mobiltelefon { get; set; }
    }

    public class Adresse
    {
        [XmlElement("Adresselinje", Order = 1)]
        [JsonProperty("Adresselinje")]
        [JsonPropertyName("Adresselinje")]
        public string Adresselinje { get; set; }

        [XmlElement("Postnummer", Order = 2)]
        [JsonProperty("Postnummer")]
        [JsonPropertyName("Postnummer")]
        public string Postnummer { get; set; }

        [XmlElement("Sted", Order = 3)]
        [JsonProperty("Sted")]
        [JsonPropertyName("Sted")]
        public string Sted { get; set; }
    }

    public class Aksjetegning
    {
        [XmlElement("AntallAksjer", Order = 1)]
        [JsonProperty("AntallAksjer")]
        [JsonPropertyName("AntallAksjer")]
        public decimal? AntallAksjer { get; set; }

        public bool ShouldSerializeAntallAksjer() => AntallAksjer.HasValue;

        [XmlElement("Aksjepris", Order = 2)]
        [JsonProperty("Aksjepris")]
        [JsonPropertyName("Aksjepris")]
        public decimal? Aksjepris { get; set; }

        public bool ShouldSerializeAksjepris() => Aksjepris.HasValue;
    }

    public class Fullmektig
    {
        [XmlElement("Etternavn", Order = 1)]
        [JsonProperty("Etternavn")]
        [JsonPropertyName("Etternavn")]
        public string Etternavn { get; set; }

        [XmlElement("Foedselsnummer", Order = 8)]
        [JsonProperty("Foedselsnummer")]
        [JsonPropertyName("Foedselsnummer")]
        public string Foedselsnummer { get; set; }
    }

    public class StifterVirksomhet
    {
        [XmlAttribute("altinnRowId")]
        [JsonPropertyName("altinnRowId")]
        [System.Text.Json.Serialization.JsonIgnore(
            Condition = JsonIgnoreCondition.WhenWritingDefault
        )]
        [Newtonsoft.Json.JsonIgnore]
        public Guid AltinnRowId { get; set; }

        public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

        [XmlElement("Navn", Order = 1)]
        [JsonProperty("Navn")]
        [JsonPropertyName("Navn")]
        public string Navn { get; set; }

        [XmlElement("Adresse", Order = 2)]
        [JsonProperty("Adresse")]
        [JsonPropertyName("Adresse")]
        public Adresse Adresse { get; set; }

        [XmlElement("Organisasjonsnummer", Order = 3)]
        [JsonProperty("Organisasjonsnummer")]
        [JsonPropertyName("Organisasjonsnummer")]
        public string Organisasjonsnummer { get; set; }

        [XmlElement("Epost", Order = 4)]
        [JsonProperty("Epost")]
        [JsonPropertyName("Epost")]
        public string Epost { get; set; }

        [XmlElement("Mobiltelefon", Order = 5)]
        [JsonProperty("Mobiltelefon")]
        [JsonPropertyName("Mobiltelefon")]
        public string Mobiltelefon { get; set; }
    }

    public class Aksjekapital
    {
        [XmlElement("AksjekapitalSum", Order = 1)]
        [JsonProperty("AksjekapitalSum")]
        [JsonPropertyName("AksjekapitalSum")]
        [Required]
        public decimal? AksjekapitalSum { get; set; }

        [XmlElement("Paalydende", Order = 2)]
        [JsonProperty("Paalydende")]
        [JsonPropertyName("Paalydende")]
        public decimal? Paalydende { get; set; }

        public bool ShouldSerializePaalydende() => Paalydende.HasValue;

        [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$")]
        [XmlElement("FristForInnbetaling", Order = 3)]
        [JsonProperty("FristForInnbetaling")]
        [JsonPropertyName("FristForInnbetaling")]
        public string FristForInnbetaling { get; set; }
    }

    public class Styre
    {
        [XmlElement("Styreleder", Order = 1)]
        [JsonProperty("Styreleder")]
        [JsonPropertyName("Styreleder")]
        public Styreleder Styreleder { get; set; }

        [XmlElement("HarNestleder", Order = 2)]
        [JsonProperty("HarNestleder")]
        [JsonPropertyName("HarNestleder")]
        public string HarNestleder { get; set; }

        [XmlElement("Nestleder", Order = 3)]
        [JsonProperty("Nestleder")]
        [JsonPropertyName("Nestleder")]
        public Nestleder Nestleder { get; set; }

        [XmlElement("Styremedlem", Order = 4)]
        [JsonProperty("Styremedlem")]
        [JsonPropertyName("Styremedlem")]
        public List<Styremedlem> Styremedlem { get; set; }
    }

    public class Styreleder
    {
        [XmlElement("Etternavn", Order = 1)]
        [JsonProperty("Etternavn")]
        [JsonPropertyName("Etternavn")]
        public string Etternavn { get; set; }

        [XmlElement("Foedselsnummer", Order = 2)]
        [JsonProperty("Foedselsnummer")]
        [JsonPropertyName("Foedselsnummer")]
        public string Foedselsnummer { get; set; }
    }

    public class Nestleder
    {
        [XmlElement("Etternavn", Order = 1)]
        [JsonProperty("Etternavn")]
        [JsonPropertyName("Etternavn")]
        public string Etternavn { get; set; }

        [XmlElement("Foedselsnummer", Order = 2)]
        [JsonProperty("Foedselsnummer")]
        [JsonPropertyName("Foedselsnummer")]
        public string Foedselsnummer { get; set; }
    }

    public class Styremedlem
    {
        [XmlAttribute("altinnRowId")]
        [JsonPropertyName("altinnRowId")]
        [System.Text.Json.Serialization.JsonIgnore(
            Condition = JsonIgnoreCondition.WhenWritingDefault
        )]
        [Newtonsoft.Json.JsonIgnore]
        public Guid AltinnRowId { get; set; }

        public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

        [XmlElement("Etternavn", Order = 1)]
        [JsonProperty("Etternavn")]
        [JsonPropertyName("Etternavn")]
        public string Etternavn { get; set; }

        [XmlElement("Foedselsnummer", Order = 2)]
        [JsonProperty("Foedselsnummer")]
        [JsonPropertyName("Foedselsnummer")]
        public string Foedselsnummer { get; set; }
    }

    public class Revisor
    {
        [XmlElement("HarRevisor", Order = 1)]
        [JsonProperty("HarRevisor")]
        [JsonPropertyName("HarRevisor")]
        public string HarRevisor { get; set; }

        [XmlElement("Navn", Order = 2)]
        [JsonProperty("Navn")]
        [JsonPropertyName("Navn")]
        public string Navn { get; set; }

        [XmlElement("Adresse", Order = 3)]
        [JsonProperty("Adresse")]
        [JsonPropertyName("Adresse")]
        public Adresse Adresse { get; set; }

        [XmlElement("Organisasjonsnummer", Order = 4)]
        [JsonProperty("Organisasjonsnummer")]
        [JsonPropertyName("Organisasjonsnummer")]
        public string Organisasjonsnummer { get; set; }

        [XmlElement("Epost", Order = 5)]
        [JsonProperty("Epost")]
        [JsonPropertyName("Epost")]
        public string Epost { get; set; }
    }
}
