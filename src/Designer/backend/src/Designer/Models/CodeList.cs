#nullable enable
using System.Collections.Generic;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Helpers.JsonConverterHelpers;

namespace Altinn.Studio.Designer.Models;

public sealed class CodeList
{
    /// <summary>
    /// Value that connects the option to the data model.
    /// </summary>
    [NotNullable]
    [JsonPropertyName("value")]
    [JsonConverter(typeof(OptionValueConverter))]
    public required object Value { get; set; }

    /// <summary>
    /// Source of the code list, e.g. "Klass"
    /// </summary>
    [JsonPropertyName("source")]
    public Source? Source { get; set; }

    /// <summary>
    /// Version of the code list
    /// </summary>
    [JsonPropertyName("version")]
    public string Version { get; set; } = string.Empty;

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

    //TODO: Move
    public Option ToOption(string lang)
    {
        return new Option
        {
            Value = Value,
            Label = Label.GetStringForLang(lang),
            Description = Description?.GetStringForLang(lang),
            HelpText = HelpText?.GetStringForLang(lang)
        };
    }
}

public sealed class LanguageSupportedString
{
    public Dictionary<string, string>? LangCodes { get; set; }

    public IEnumerable<string> GetAvailableLangs()
    {
        if (LangCodes is null)
        {
            return [];
        }
        return [.. LangCodes.Keys];
    }

    public string GetStringForLang(string lang)
    {
        if (LangCodes is null)
        {
            return string.Empty;
        }
        if (LangCodes.TryGetValue(lang, out string? value))
        {
            return value;
        }

        return string.Empty;
    }
}

/// <summary>
/// The source of the code list
/// </summary>
public sealed record Source
{
    public string Name { get; set; } = string.Empty;
}
