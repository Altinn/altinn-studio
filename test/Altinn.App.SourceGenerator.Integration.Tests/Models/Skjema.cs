using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding;

#pragma warning disable IDE1006 // Naming Styles

namespace Altinn.App.SourceGenerator.Integration.Tests.Models;

public class Skjema
{
    // Extra properties to test that they get ignored by source generator
    public const string FormDataType = "form";
    public static readonly string FormDataTypeStatic = FormDataType;
    public string FormDataTypeId => FormDataType;

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

    [JsonPropertyName("oldXmlValue")]
    public OldXmlValue? OldXmlValue { get; set; }

    [JsonPropertyName("withCollection")]
    public ICollection<Adresse>? WithCollection { get; set; }
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

    // List of string is invalid in altinn datamodels, but might be used for backend purposes and must compile
    [JsonPropertyName("tags")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<string>? Tags { get; set; }
}

public class OldXmlValue
{
    [Range(-999999999999999d, 999999999999999d)]
    [Required]
    [XmlIgnore]
    [JsonPropertyName("value")]
    public decimal? valueNullable { get; set; }

    [XmlText]
    [JsonIgnore]
    public decimal value
    {
        get => valueNullable ?? default;
        set { valueNullable = value; }
    }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7117";
}

public class Empty { }
