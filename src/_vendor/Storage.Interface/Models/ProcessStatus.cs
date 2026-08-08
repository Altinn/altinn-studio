#nullable disable

using System.Runtime.Serialization;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using TextJson = System.Text.Json.Serialization;

namespace Altinn.Platform.Storage.Interface.Models;

/// <summary>
/// Storage-controlled process status values.
/// </summary>
[JsonConverter(typeof(StringEnumConverter))]
[TextJson.JsonConverter(typeof(TextJson.JsonStringEnumConverter))]
public enum ProcessStatus
{
    /// <summary>
    /// The instance process is available for user-facing mutations.
    /// </summary>
    [EnumMember(Value = "idle")]
    [TextJson.JsonStringEnumMemberName("idle")]
    Idle,

    /// <summary>
    /// The instance process is owned by an active workflow transition.
    /// </summary>
    [EnumMember(Value = "processing")]
    [TextJson.JsonStringEnumMemberName("processing")]
    Processing,
}
