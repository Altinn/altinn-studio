using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Options.Altinn3LibraryCodeList;

/// <summary>
/// Outer model for the Altinn 3 library code list API
/// </summary>
public class Altinn3LibraryCodeListResponse
{
    /// <summary>
    /// List of codes in the code list
    /// </summary>
    [JsonPropertyName("codes")]
    public required List<Altinn3LibraryCodeListItem> Codes { get; set; }

    /// <summary>
    /// Version of the code list
    /// </summary>
    [JsonPropertyName("version")]
    public required string Version { get; set; }

    /// <summary>
    /// Tag names used for grouping in combination with <see cref="Altinn3LibraryCodeListItem.Tags"/>
    /// Eg: tagNames: ["region"], tags: ["europe"]
    /// </summary>
    [JsonPropertyName("tagNames")]
    public List<string>? TagNames { get; set; }
}

/// <summary>
/// Altinn 3 code list item
/// </summary>
public class Altinn3LibraryCodeListItem
{
    /// <summary>
    /// Value of the code list item
    /// </summary>
    [JsonPropertyName("value")]
    public required string Value { get; set; }

    /// <summary>
    /// Labels for the code list item where the key is the language code, ISO 639-1 (eg. nb)
    /// </summary>
    [JsonPropertyName("label")]
    public required Dictionary<string, string> Label { get; set; }

    /// <summary>
    /// Descriptions for the code list item where the key is the language code, ISO 639-1 (eg. nb)
    /// </summary>
    [JsonPropertyName("description")]
    public Dictionary<string, string>? Description { get; set; }

    /// <summary>
    /// Help texts for the code list item where the key is the language code, ISO 639-1 (eg. nb)
    /// </summary>
    [JsonPropertyName("helpText")]
    public Dictionary<string, string>? HelpText { get; set; }

    /// <summary>
    /// Tags for the code list item, used for grouping in combination with <see cref="Altinn3LibraryCodeListResponse.TagNames"/>
    /// Eg: tagNames: ["region"], tags: ["europe"]
    /// </summary>
    [JsonPropertyName("tags")]
    public List<string>? Tags { get; set; }
}
