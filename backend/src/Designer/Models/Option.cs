using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Models.Interfaces;

namespace Altinn.Studio.Designer.Models;

/// <summary>
/// Options used in checkboxes, radio buttons and dropdowns.
/// </summary>
public class Option<T> where T : IOptionValue
{
    /// <summary>
    /// Value that connects the option to the data model.
    /// </summary>
    [Required]
    [JsonPropertyName("value")]
    public T Value { get; set; }

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
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string Description { get; set; }

    /// <summary>
    /// Help text, typically wrapped inside a popover.
    /// </summary>
    [JsonPropertyName("helpText")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string HelpText { get; set; }
}
