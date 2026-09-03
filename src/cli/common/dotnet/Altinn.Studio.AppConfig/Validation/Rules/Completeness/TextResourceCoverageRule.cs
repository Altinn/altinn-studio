using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Completeness;

internal sealed class TextResourceCoverageRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "TEXT-RESOURCE-COVERAGE",
            "Text-resource keys should exist in every declared language",
            "Every key declared in any resource.<lang>.json should also be declared in "
                + "the resource files of the other languages listed in applicationmetadata.title. "
                + "A key missing from one language renders the fallback (typically nb) instead — "
                + "the app runs but the translation is incomplete.",
            Severity.Info
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        var declared = app.DeclaredLanguages().ToHashSet(StringComparer.Ordinal);
        if (declared.Count < 2)
            yield break;

        var keysByLang = new Dictionary<string, HashSet<string>>(StringComparer.Ordinal);
        foreach (var tr in app.TextResources)
        {
            if (!declared.Contains(tr.Language))
                continue;
            keysByLang[tr.Language] = new HashSet<string>(tr.Ids.Keys, StringComparer.Ordinal);
        }

        foreach (var lang in declared.OrderBy(s => s, StringComparer.Ordinal))
        {
            if (!keysByLang.TryGetValue(lang, out var presentKeys))
                continue;
            foreach (var (otherLang, otherKeys) in keysByLang.OrderBy(kv => kv.Key, StringComparer.Ordinal))
            {
                if (string.Equals(otherLang, lang, StringComparison.Ordinal))
                    continue;
                var trWithLang = app.TextResources.FirstOrDefault(t => t.Language == lang);
                if (trWithLang is null)
                    continue;
                foreach (var key in presentKeys.OrderBy(s => s, StringComparer.Ordinal))
                {
                    if (otherKeys.Contains(key))
                        continue;
                    if (!trWithLang.Ids.TryGetValue(key, out var pos))
                        continue;
                    // Point at the key's declaration in the language that HAS it, so the editor
                    // jumps to the file the user copies from.
                    yield return Metadata.Report(
                        $"text-resource key \"{key}\" is declared in resource.{lang}.json but missing from resource.{otherLang}.json",
                        pos
                    );
                }
            }
        }
    }
}
