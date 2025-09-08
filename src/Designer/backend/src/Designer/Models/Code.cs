#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Helpers.JsonConverterHelpers;

namespace Altinn.Studio.Designer.Models;

public sealed class Code
{
    /// <summary>
    /// Value that connects the option to the data model.
    /// </summary>
    [NotNullable]
    [JsonPropertyName("value")]
    [JsonConverter(typeof(OptionValueConverter))]
    public required object Value { get; set; }

    /// <summary>
    /// Label to present to the user.
    /// </summary>
    [NotNullable]
    [JsonPropertyName("label")]
    public required Dictionary<string, string> Label { get; set; }

    /// <summary>
    /// Description, typically displayed below the label.
    /// </summary>
    [JsonPropertyName("description")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Dictionary<string, string>? Description { get; set; }

    /// <summary>
    /// Help text, typically wrapped inside a popover.
    /// </summary>
    [JsonPropertyName("helpText")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Dictionary<string, string>? HelpText { get; set; }

    [JsonPropertyName("customColumnsList")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<string>? CustomColumnsList { get; set; }

    public override bool Equals(object? obj)
    {
        Code? other = obj as Code;
        if (other is null)
        {
            return false;
        }

        if (!Equals(other.Value, Value))
        {
            return false;
        }

        if (!Equals(other.Label, Label))
        {
            return false;
        }

        if (!Equals(other.Description, Description))
        {
            return false;
        }

        if (!Equals(other.HelpText, HelpText))
        {
            return false;
        }

        if (other.CustomColumnsList is null || CustomColumnsList is null)
        {
            return false;
        }

        if (!other.CustomColumnsList.SequenceEqual(CustomColumnsList))
        {
            return false;
        }

        return true;
    }

    public override int GetHashCode()
    {
        return HashCode.Combine(Value, Label, Description, HelpText);
    }
}
