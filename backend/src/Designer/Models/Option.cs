using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.CodeAnalysis;

namespace Altinn.Studio.Designer.Models;

/// <summary>
/// Options used in checkboxes, radio buttons and dropdowns.
/// </summary>
public class Option
{
    /// <summary>
    /// Value that connects the option to the data model.
    /// </summary>
    [Required]
    [JsonPropertyName("value")]
    public string Value { get; set; }

    /// <summary>
    /// Label to present to the user.
    /// </summary>
    [Required]
    [JsonPropertyName("label")]
    public string Label { get; set; }

    /// <summary>
    /// Description, typically displayed below the label.
    /// </summary>
    [JsonPropertyName("description")]
    public Optional<string> Description { get; set; }

    /// <summary>
    /// Help text, typically wrapped inside a popover.
    /// </summary>
    [JsonPropertyName("helpText")]
    public Optional<string> HelpText { get; set; }
}
