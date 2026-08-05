#nullable disable

using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using TextJson = System.Text.Json.Serialization;

namespace Altinn.Platform.Storage.Interface.Enums;

/// <summary>
/// The type of the connected object
/// </summary>
[JsonConverter(typeof(StringEnumConverter))]
[TextJson.JsonConverter(typeof(TextJson.JsonStringEnumConverter))]
public enum ReferenceType
{
    /// <summary>
    /// The connected object is a data element
    /// </summary>
    DataElement,

    /// <summary>
    /// The connected object is a task
    /// </summary>
    Task,
}
