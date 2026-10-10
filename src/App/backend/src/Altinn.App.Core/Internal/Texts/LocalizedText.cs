using System.Text;
using System.Text.RegularExpressions;
using Altinn.App.Core.Internal.Language;

namespace Altinn.App.Core.Internal.Texts;

/// <summary>
/// A text in bokmål, nynorsk and English. Any other language gets the English text.
/// </summary>
internal sealed partial class LocalizedText : ILocalizedText
{
    private readonly Template _nb;
    private readonly Template _nn;
    private readonly Template _en;
    private readonly List<string> _replacementKeys = [];

    public LocalizedText(string nb, string nn, string en)
    {
        Nb = nb;
        Nn = nn;
        En = en;
        _nb = Parse(nb);
        _nn = Parse(nn);
        _en = Parse(en);
    }

    /// <summary>
    /// A text that is the same in every language.
    /// </summary>
    public static LocalizedText Invariant(string text) => new(nb: text, nn: text, en: text);

    public string Nb { get; }
    public string Nn { get; }
    public string En { get; }

    /// <inheritdoc />
    public IReadOnlyList<string> ReplacementKeys => _replacementKeys;

    /// <inheritdoc />
    public IEnumerable<(string Language, string Text)> RawTexts =>
        [(LanguageConst.Nb, Nb), (LanguageConst.Nn, Nn), (LanguageConst.En, En)];

    /// <inheritdoc />
    public string Apply(string language, ReadOnlySpan<string?> values)
    {
        if (values.Length != _replacementKeys.Count)
        {
            throw new ArgumentException(
                $"The text has {_replacementKeys.Count} replacement keys, but got {values.Length} values",
                nameof(values)
            );
        }

        var template = language switch
        {
            LanguageConst.Nb => _nb,
            LanguageConst.Nn => _nn,
            _ => _en,
        };

        var text = new StringBuilder();
        foreach (var (literal, keyIndex) in template.Segments)
        {
            text.Append(keyIndex < 0 ? literal : values[keyIndex] ?? literal);
        }
        return text.ToString();
    }

    /// <summary>
    /// Splits a text into literal parts and placeholders, so <see cref="Apply"/> fills it in one pass. A placeholder
    /// segment keeps its <c>{name}</c> text, for when its value is null.
    /// </summary>
    private Template Parse(string text)
    {
        var segments = new List<(string Literal, int KeyIndex)>();
        var position = 0;
        foreach (Match match in PlaceholderRegex().Matches(text))
        {
            if (match.Index > position)
            {
                segments.Add((text[position..match.Index], -1));
            }

            var key = match.Groups[1].Value;
            var keyIndex = _replacementKeys.IndexOf(key);
            if (keyIndex < 0)
            {
                keyIndex = _replacementKeys.Count;
                _replacementKeys.Add(key);
            }
            segments.Add((match.Value, keyIndex));
            position = match.Index + match.Length;
        }

        if (position < text.Length)
        {
            segments.Add((text[position..], -1));
        }
        return new Template(segments);
    }

    [GeneratedRegex(@"\{([^{}]+)\}")]
    private static partial Regex PlaceholderRegex();

    private sealed record Template(IReadOnlyList<(string Literal, int KeyIndex)> Segments);
}
