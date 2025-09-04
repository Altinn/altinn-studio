#nullable enable
using System.Collections.Generic;
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
    public required LanguageSupportedString Label { get; set; }

    /// <summary>
    /// Description, typically displayed below the label.
    /// </summary>
    [JsonPropertyName("description")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public LanguageSupportedString? Description { get; set; }

    /// <summary>
    /// Help text, typically wrapped inside a popover.
    /// </summary>
    [JsonPropertyName("helpText")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public LanguageSupportedString? HelpText { get; set; }
}

public sealed class LanguageSupportedString
{
    public Dictionary<string, string>? LanguageCodes { get; set; }

    public IEnumerable<string> GetAvailableLanguages()
    {
        if (LanguageCodes is null)
        {
            return [];
        }
        return [.. LanguageCodes.Keys];
    }

    public string GetStringForLang(string lang)
    {
        if (LanguageCodes is null)
        {
            return string.Empty;
        }
        if (LanguageCodes.TryGetValue(lang, out string? value))
        {
            return value;
        }

        return string.Empty;
    }
}
