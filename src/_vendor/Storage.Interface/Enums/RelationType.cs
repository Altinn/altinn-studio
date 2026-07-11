#nullable disable

using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using TextJson = System.Text.Json.Serialization;

namespace Altinn.Platform.Storage.Interface.Enums;

/// <summary>
/// The type of relation to the connected object
/// </summary>
[JsonConverter(typeof(StringEnumConverter))]
[TextJson.JsonConverter(typeof(TextJson.JsonStringEnumConverter))]
public enum RelationType
{
    /// <summary>
    /// The connected object is generated from the connected object and should be deleted if the reference is changed
    /// </summary>
    GeneratedFrom,
}
