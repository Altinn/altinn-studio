using Altinn.App.Core.Internal.Language;

namespace Altinn.App.Core.Internal.Texts;

/// <summary>
/// A text that the backend provides a default for. An app overrides it by adding a text resource with the same
/// <see cref="Key"/>.
/// </summary>
internal sealed class BackendTextResource
{
    private IReadOnlyList<BackendTextVariable>? _customTextParameters;
    private TextTemplate? _nb;
    private TextTemplate? _nn;
    private TextTemplate? _en;

    /// <summary>
    /// The text resource id.
    /// </summary>
    public required string Key { get; init; }

    /// <summary>
    /// The default texts. Placeholders name a variable in <see cref="Variables"/>, like <c>{maxSize}</c>.
    /// </summary>
    public required LocalizedText Texts { get; init; }

    /// <summary>
    /// The variables the default texts use, of any source.
    /// </summary>
    public IReadOnlyList<BackendTextVariable> Variables { get; init; } = [];

    /// <summary>
    /// The variables the caller passes in customTextParameters, in the order they are passed.
    /// </summary>
    public IReadOnlyList<BackendTextVariable> CustomTextParameters =>
        _customTextParameters ??= [
            .. Variables.Where(variable => variable.Source is TextVariableSource.CustomTextParameter),
        ];

    /// <summary>
    /// The template for nb, nn or en, built once, or null for any other language.
    /// </summary>
    /// <exception cref="InvalidOperationException">The text uses a placeholder that names no variable.</exception>
    public TextTemplate? ToTemplate(string language) =>
        language switch
        {
            LanguageConst.Nb => _nb ??= Parse(Texts.Nb),
            LanguageConst.Nn => _nn ??= Parse(Texts.Nn),
            LanguageConst.En => _en ??= Parse(Texts.En),
            _ => null,
        };

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

    private TextTemplate Parse(string text) =>
        TextTemplateParser.Parse(
            text,
            name =>
                Variables.FirstOrDefault(variable => variable.Name == name)?.Source
                ?? throw new InvalidOperationException($"Text resource '{Key}' uses {{{name}}}, which is no variable")
        );
}
