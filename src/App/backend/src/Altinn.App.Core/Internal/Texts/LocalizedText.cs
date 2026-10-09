using System.Collections.Frozen;
using Altinn.App.Core.Internal.Language;

namespace Altinn.App.Core.Internal.Texts;

/// <summary>
/// Builds the language → text dictionary for <see cref="BackendTextResource.DefaultText"/>.
/// </summary>
internal static class LocalizedText
{
    public static FrozenDictionary<string, string> Create(string nb, string nn, string en) =>
        new Dictionary<string, string>
        {
            [LanguageConst.Nb] = nb,
            [LanguageConst.Nn] = nn,
            [LanguageConst.En] = en,
        }.ToFrozenDictionary();
}
