#nullable disable

using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using TextJson = System.Text.Json.Serialization;

namespace Altinn.Platform.Storage.Interface.Enums;

/// <summary>
/// Represents different scanning results for when files are being scanned for malware.
/// </summary>
[JsonConverter(typeof(StringEnumConverter))]
[TextJson.JsonConverter(typeof(TextJson.JsonStringEnumConverter))]
public enum FileScanResult
{
    /// <summary>
    /// The file will not be scanned. File scanning is turned off.
    /// </summary>
    NotApplicable,

    /// <summary>
    /// The scan status of the file is pending. This is the default value.
    /// </summary>
    Pending,

    /// <summary>
    /// The file scan did not find any malware in the file.
    /// </summary>
    Clean,

    /// <summary>
    /// The file scan found malware in the file.
    /// </summary>
    Infected,
}
