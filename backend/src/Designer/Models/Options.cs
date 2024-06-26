using System.Collections.Generic;
using Microsoft.CodeAnalysis;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Models;

/// <summary>
/// Individual options.
/// </summary>
[JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
public class Options
{
    /// <summary>
    /// The value that connects the option to the data model.
    /// </summary>
    [JsonProperty(PropertyName = "value")]
    public string Value { get; set; }

    /// <summary>
    /// The label to present to the user.
    /// </summary>
    [JsonProperty(PropertyName = "label")]
    public string Label { get; set; }

    /// <summary>
    /// Description - typically displayed below the label.
    /// </summary>
    [JsonProperty(PropertyName = "description")]
    public Optional<string> Description { get; set; }

    /// <summary>
    /// Help text - typically hidden inside a popover.
    /// </summary>
    [JsonProperty(PropertyName = "helpText")]
    public Optional<string> HelpText { get; set; }
}

/// <summary>
/// Options list (code list) to be used in radio buttons or checkboxes.
/// </summary>
[JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
public class OptionsList
{
    /// <summary>
    /// The options in the list.
    /// </summary>
    [JsonProperty(PropertyName = "options")]
    public List<Options> Options { get; set; }
}
