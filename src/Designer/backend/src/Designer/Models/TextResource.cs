#nullable disable
using System.Collections.Generic;
using System.Text.Json.Serialization;
using Microsoft.CodeAnalysis;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Models;

/// <summary>
/// Represents a set of texts on a specified language.
/// </summary>
[JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
public class TextResource
{
    /// <summary>
    /// The URL to the JSON schema for text resource files.
    /// </summary>
    public const string SchemaUrl = "https://altinncdn.no/schemas/json/text-resources/text-resources.schema.v1.json";

    /// <summary>
    /// Gets or sets the URL to the JSON schema for this file.
    /// </summary>
    [JsonProperty(PropertyName = "$schema")]
    [JsonPropertyName("$schema")]
    public string Schema { get; set; }

    /// <summary>
    /// Gets or sets the language. Should be a two letter ISO name.
    /// </summary>
    [JsonProperty(PropertyName = "language")]
    public string Language { get; set; }

    /// <summary>
    /// Gets or sets a list of text resource elements
    /// </summary>
    [JsonProperty(PropertyName = "resources")]
    public List<TextResourceElement> Resources { get; set; }
}

/// <summary>
/// TextId mutation.
/// </summary>
[JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
public class TextIdMutation
{
    /// <summary>
    /// The original id in the mutating text-resource.
    /// </summary>
    [JsonProperty(PropertyName = "oldId")]
    public string OldId;

    /// <summary>
    /// The id to change to.
    /// </summary>
    [JsonProperty(PropertyName = "newId")]
    public Optional<string> NewId;
}
