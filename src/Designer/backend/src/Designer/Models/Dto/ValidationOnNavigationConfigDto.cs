using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// The payload for saving or deleting a validation-on-navigation configuration. The level is implied by the
/// fields present: <c>Task</c> + <c>Pages</c> targets pages, <c>Tasks</c> targets layout sets, and neither
/// targets the global configuration. <c>Show</c> and <c>Page</c> hold the configuration itself.
/// </summary>
public class ValidationOnNavigationConfigDto
{
    [JsonPropertyName("show")]
    public List<string>? Show { get; set; }

    [JsonPropertyName("page")]
    public string? Page { get; set; }

    [JsonPropertyName("tasks")]
    public List<string>? Tasks { get; set; }

    [JsonPropertyName("task")]
    public string? Task { get; set; }

    [JsonPropertyName("pages")]
    public List<string>? Pages { get; set; }
}
