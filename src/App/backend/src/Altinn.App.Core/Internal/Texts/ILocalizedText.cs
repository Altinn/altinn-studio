namespace Altinn.App.Core.Internal.Texts;

/// <summary>
/// A text in several languages with named placeholders, like <c>{maxSize}</c>.
/// </summary>
internal interface ILocalizedText
{
    /// <summary>
    /// The names of the placeholders the texts use, each once, in a fixed order.
    /// </summary>
    IReadOnlyList<string> ReplacementKeys { get; }

    /// <summary>
    /// The finished text for <paramref name="language"/>, or for the language it falls back to. Each
    /// <c>{ReplacementKeys[i]}</c> is replaced by <c>values[i]</c>; a null value leaves its placeholder as it is.
    /// </summary>
    string Apply(string language, ReadOnlySpan<string?> values);

    /// <summary>
    /// The languages that have their own text, with the text before any placeholder is replaced.
    /// </summary>
    IEnumerable<(string Language, string Text)> RawTexts { get; }
}
