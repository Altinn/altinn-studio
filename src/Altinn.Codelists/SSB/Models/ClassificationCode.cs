using System.Text.Json.Serialization;

namespace Altinn.Codelists.SSB.Models;

/// <summary>
/// Represents a single classification code.
/// </summary>
public class ClassificationCode
{
    /// <summary>
    /// Initializes a new instance of the <see cref="ClassificationCode"/> class.
    /// </summary>
    public ClassificationCode(string code, string name, string level)
    {
        Code = code;
        Name = name;
        Level = level;
    }

    /// <summary>
    /// Unique classification code
    /// </summary>
    [JsonPropertyName("code")]
    public string Code { get; set; }

    /// <summary>
    /// If part of a hierarchy, this is a reference to the parent <see cref="Code"/>
    /// </summary>
    [JsonPropertyName("parentCode")]
    public string? ParentCode { get; set; } = null;

    /// <summary>
    /// Hierarchy level for classifications thats hierarchical. Non hierarchical classifications
    /// will have a value of one.
    /// </summary>
    [JsonPropertyName("level")]
    public string Level { get; set; }

    /// <summary>
    /// Classification name.
    /// </summary>
    [JsonPropertyName("name")]
    public string Name { get; set; }

    /// <summary>
    /// Classification short name.
    /// </summary>
    [JsonPropertyName("shortName")]
    public string ShortName { get; set; } = string.Empty;

    /// <summary>
    /// Classification presentation name.
    /// </summary>
    [JsonPropertyName("presentationName")]
    public string PresentationName { get; set; } = string.Empty;

    /// <summary>
    /// When the the classification is valid from.
    /// </summary>
    [JsonPropertyName("validFrom")]
    public DateTime? ValidFrom { get; set; }

    /// <summary>
    /// When the classification is valid to.
    /// </summary>
    [JsonPropertyName("validTo")]
    public DateTime? ValidTo { get; set; }

    /// <summary>
    /// Given a range (from/to) that spans dates where the classification has changed,
    /// this will show the from date the classification is valid. In such a response
    /// you will get multiple entries and will have to use <see cref="ValidFromInRequestedRange"/>
    /// and <see cref="ValidToInRequestedRange"/> to separate them.
    /// </summary>
    [JsonPropertyName("validFromInRequestedRange")]
    public DateTime? ValidFromInRequestedRange { get; set; }

    /// <summary>
    /// Given a range (from/to) that spans dates where the classification has changed,
    /// this will show the to date the classification is valid. In such a response
    /// you will get multiple entries and will have to use <see cref="ValidFromInRequestedRange"/>
    /// and <see cref="ValidToInRequestedRange"/> to separate them.
    /// </summary>
    [JsonPropertyName("validToInRequestedRange")]
    public DateTime? ValidToInRequestedRange { get; set; }

    /// <summary>
    /// Textual notes added to the classification code.
    /// </summary>
    [JsonPropertyName("notes")]
    public string Notes { get; set; } = string.Empty;
}
