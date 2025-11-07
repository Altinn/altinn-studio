using System.Text.Json.Serialization;

namespace Altinn.App.SourceGenerator.Tests;

public class Skjema
{
    [JsonPropertyName("skjemanummer")]
    public string? Skjemanummer { get; set; }

    [JsonPropertyName("skjemaversjon")]
    public string? Skjemaversjon { get; set; }

    [JsonPropertyName("skjemainnhold")]
    public List<SkjemaInnhold?>? Skjemainnhold { get; set; }

    [JsonPropertyName("eierAdresse")]
    public Adresse? EierAdresse { get; set; }
}

public class SkjemaInnhold
{
    [JsonPropertyName("altinnRowId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public Guid AltinnRowId { get; set; }

    [JsonPropertyName("navn")]
    public string? Navn { get; set; }

    [JsonPropertyName("alder")]
    public int? Alder { get; set; }

    [JsonPropertyName("deltar")]
    public bool? Deltar { get; set; }

    [JsonPropertyName("adresse")]
    public Adresse? Adresse { get; set; }

    [JsonPropertyName("tidligere-adresse")]
    public List<Adresse>? TidligereAdresse { get; set; }
}

public class Adresse
{
    [JsonPropertyName("altinnRowId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public Guid AltinnRowId { get; set; }

    [JsonPropertyName("gate")]
    public string? Gate { get; set; }

    [JsonPropertyName("postnummer")]
    public int? Postnummer { get; set; }

    [JsonPropertyName("poststed")]
    public string? Poststed { get; set; }
}

public class Empty { }
