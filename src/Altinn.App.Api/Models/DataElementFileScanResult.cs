#nullable disable
using System.Text.Json.Serialization;
using Altinn.Platform.Storage.Interface.Enums;

namespace Altinn.App.Api.Models;

/// <summary>
/// File scan result for an individual data element.
/// </summary>
public class DataElementFileScanResult
{
    /// <summary>
    /// Gets or sets the data element id
    /// </summary>
    [JsonPropertyName("id")]
    public string Id { get; set; }

    /// <summary>
    /// Gets or sets the file scan result for the data element.
    /// </summary>
    [JsonPropertyName("fileScanResult")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public FileScanResult FileScanResult { get; set; }
}
