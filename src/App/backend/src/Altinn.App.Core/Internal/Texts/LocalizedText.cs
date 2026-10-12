using Altinn.App.Core.Internal.Language;

namespace Altinn.App.Core.Internal.Texts;

/// <summary>
/// A text in bokmål, nynorsk and English.
/// </summary>
internal sealed record LocalizedText
{
    public LocalizedText(string nb, string nn, string en)
    {
        Nb = nb;
        Nn = nn;
        En = en;
    }

    /// <summary>
    /// A text that is the same in every language.
    /// </summary>
    public static LocalizedText Invariant(string text) => new(nb: text, nn: text, en: text);

    public string Nb { get; }
    public string Nn { get; }
    public string En { get; }

    /// <summary>
    /// The texts with their language, before any placeholder is filled in.
    /// </summary>
    public IEnumerable<(string Language, string Text)> RawTexts =>
        [(LanguageConst.Nb, Nb), (LanguageConst.Nn, Nn), (LanguageConst.En, En)];
}
