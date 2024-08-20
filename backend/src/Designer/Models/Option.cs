using System.ComponentModel.DataAnnotations;
using Newtonsoft.Json;

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
    [JsonProperty(PropertyName = "value")]
    public string Value { get; set; }

    /// <summary>
    /// Label to present to the user.
    /// </summary>
    [Required]
    [JsonProperty(PropertyName = "label")]
    public string Label { get; set; }

    /// <summary>
    /// Description, typically displayed below the label.
    /// </summary>
    [JsonProperty(PropertyName = "description", NullValueHandling = NullValueHandling.Ignore)]
    public string Description { get; set; }

    /// <summary>
    /// Help text, typically wrapped inside a popover.
    /// </summary>
    [JsonProperty(PropertyName = "helpText", NullValueHandling = NullValueHandling.Ignore)]
    public string HelpText { get; set; }
}
