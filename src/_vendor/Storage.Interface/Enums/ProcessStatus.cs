#nullable disable

using System.Runtime.Serialization;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using TextJson = System.Text.Json.Serialization;

namespace Altinn.Platform.Storage.Interface.Enums;

/// <summary>
/// Storage-controlled process status values. The wire spelling is the lowercase member name, which
/// the persisted instance and every SQL process-status comparison depend on.
/// </summary>
[JsonConverter(typeof(ProcessStatusNewtonsoftConverter))]
[TextJson.JsonConverter(typeof(ProcessStatusTextJsonConverter))]
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

/// <summary>
/// Serializes <see cref="ProcessStatus"/> as a string for Newtonsoft.Json, rejecting the numeric
/// form the default converter would otherwise accept.
/// </summary>
public sealed class ProcessStatusNewtonsoftConverter : StringEnumConverter
{
    /// <summary>
    /// Creates a converter that accepts only the string form.
    /// </summary>
    public ProcessStatusNewtonsoftConverter()
    {
        AllowIntegerValues = false;
    }
}

/// <summary>
/// Serializes <see cref="ProcessStatus"/> as a string for System.Text.Json, rejecting the numeric
/// form the default converter would otherwise accept.
/// </summary>
public sealed class ProcessStatusTextJsonConverter : TextJson.JsonStringEnumConverter<ProcessStatus>
{
    /// <summary>
    /// Creates a converter that accepts only the string form.
    /// </summary>
    public ProcessStatusTextJsonConverter()
        : base(namingPolicy: null, allowIntegerValues: false) { }
}
