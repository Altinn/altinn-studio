using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Completeness;

internal sealed class TextResourceCoverageRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "TEXT-RESOURCE-COVERAGE",
            "Text-resource keys should exist in every app language",
            "Every key declared in one config/texts/resource.<lang>.json should also be declared "
                + "in the resource files of the other languages the app offers. The app loads only "
                + "the texts of the user's language, so a key missing from it renders as the bare "
                + "key (or the frontend's built-in text for the keys it ships) — the app runs but "
                + "the translation is incomplete.",
            Severity.Info
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        var languages = app.LanguageTextResources().OrderBy(t => t.Language, StringComparer.Ordinal).ToList();
        foreach (var texts in languages)
        {
            foreach (var other in languages)
            {
                if (string.Equals(other.Language, texts.Language, StringComparison.Ordinal))
                    continue;
                foreach (var (key, pos) in texts.Ids.OrderBy(kv => kv.Key, StringComparer.Ordinal))
                {
                    if (other.Ids.ContainsKey(key))
                        continue;
                    // Point at the key's declaration in the language that HAS it, so the editor
                    // jumps to the file the user copies from.
                    yield return Metadata.Report(
                        $"text-resource key \"{key}\" is declared in resource.{texts.Language}.json but missing from resource.{other.Language}.json",
                        pos
                    );
                }
            }
        }
    }
}
