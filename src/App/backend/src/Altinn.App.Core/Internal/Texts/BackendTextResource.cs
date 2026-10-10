namespace Altinn.App.Core.Internal.Texts;

/// <summary>
/// A text that the backend provides a default for. An app overrides it by adding a text resource with the same
/// <see cref="Key"/>.
/// </summary>
internal sealed class BackendTextResource
{
    private IReadOnlyList<CustomTextParameter>? _customTextParameters;
    private IReadOnlyList<BackendTextVariable>? _replacementVariables;

    /// <summary>
    /// The text resource id.
    /// </summary>
    public required string Key { get; init; }

    /// <summary>
    /// The default texts. Placeholders name a variable in <see cref="Variables"/>, like <c>{maxSize}</c>.
    /// </summary>
    public required ILocalizedText Texts { get; init; }

    /// <summary>
    /// The variables the default texts use, of any data source.
    /// </summary>
    public IReadOnlyList<BackendTextVariable> Variables { get; init; } = [];

    /// <summary>
    /// The variables the caller passes in customTextParameters, in the order they are passed.
    /// </summary>
    public IReadOnlyList<CustomTextParameter> CustomTextParameters =>
        _customTextParameters ??= [.. Variables.OfType<CustomTextParameter>()];

    /// <summary>
    /// The variable for each of the texts' <see cref="ILocalizedText.ReplacementKeys"/>, in the same order.
    /// </summary>
    /// <exception cref="InvalidOperationException">A placeholder names no variable.</exception>
    public IReadOnlyList<BackendTextVariable> ReplacementVariables =>
        _replacementVariables ??= [
            .. Texts.ReplacementKeys.Select(key =>
                Variables.FirstOrDefault(variable => variable.Name == key)
                ?? throw new InvalidOperationException($"Text resource '{Key}' uses {{{key}}}, which is no variable")
            ),
        ];

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
}
