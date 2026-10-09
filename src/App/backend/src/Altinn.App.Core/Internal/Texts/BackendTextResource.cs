using System.Collections.Frozen;
using Altinn.App.Core.Internal.Language;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Texts;

/// <summary>
/// A text that the backend provides a default for. An app overrides it by adding a text resource with the same
/// <see cref="Key"/>.
/// </summary>
internal sealed class BackendTextResource
{
    private FrozenDictionary<string, string>? _indexedDefaultText;

    /// <summary>
    /// The text resource id.
    /// </summary>
    public required string Key { get; init; }

    /// <summary>
    /// Default text per language. Placeholders name a parameter in <see cref="CustomTextParameters"/>, like <c>{maxSize}</c>.
    /// </summary>
    public required IReadOnlyDictionary<string, string> DefaultText { get; init; }

    /// <summary>
    /// The parameters this text receives in customTextParameters, in the order they are passed.
    /// </summary>
    public IReadOnlyList<CustomTextParameter> CustomTextParameters { get; init; } = [];

    /// <summary>
    /// Pairs <paramref name="values"/> with <see cref="CustomTextParameters"/> by position.
    /// A null value leaves the parameter out. Returns null when the text takes no parameters.
    /// </summary>
    public Dictionary<string, string>? CreateCustomTextParameters(ReadOnlySpan<string?> values)
    {
        if (values.Length != CustomTextParameters.Count)
        {
            throw new ArgumentException(
                $"Text resource '{Key}' takes {CustomTextParameters.Count} custom text parameters, but got {values.Length}",
                nameof(values)
            );
        }
        if (values.Length == 0)
        {
            return null;
        }

        var parameters = new Dictionary<string, string>(values.Length);
        for (var i = 0; i < values.Length; i++)
        {
            if (values[i] is { } value)
            {
                parameters[CustomTextParameters[i].Name] = value;
            }
        }
        return parameters;
    }

    /// <summary>
    /// The default text in <paramref name="language"/>, or in English when that language is missing.
    /// Each named placeholder becomes the numbered placeholder of a customTextParameters variable.
    /// </summary>
    public TextResourceElement? GetDefaultResource(string language)
    {
        _indexedDefaultText ??= DefaultText.ToFrozenDictionary(
            pair => pair.Key,
            pair => ToIndexedPlaceholders(pair.Value)
        );

        // The fallback rules are nn → nb → en and anything else → en. Built-in texts always have nn when they
        // have nb, so the nb step is left out.
        if (
            !_indexedDefaultText.TryGetValue(language, out var value)
            && !_indexedDefaultText.TryGetValue(LanguageConst.En, out value)
        )
        {
            return null;
        }

        return new TextResourceElement()
        {
            Id = Key,
            Value = value,
            Variables = CustomTextParameters
                .Select(parameter => new TextResourceVariable()
                {
                    DataSource = "customTextParameters",
                    Key = parameter.Name,
                    DefaultValue = "",
                })
                .ToList(),
        };
    }

    private string ToIndexedPlaceholders(string text)
    {
        for (var i = 0; i < CustomTextParameters.Count; i++)
        {
            text = text.Replace("{" + CustomTextParameters[i].Name + "}", "{" + i + "}", StringComparison.Ordinal);
        }
        return text;
    }
}
