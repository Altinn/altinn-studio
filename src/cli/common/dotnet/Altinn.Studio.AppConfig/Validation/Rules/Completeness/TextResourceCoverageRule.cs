using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Completeness;

internal sealed class TextResourceCoverageRule : IValidationRule
{
    private const int ExampleKeyCount = 3;

    public RuleMetadata Metadata { get; } =
        new(
            "TEXT-RESOURCE-COVERAGE",
            "Text-resource keys should exist in every app language",
            "Every key declared in one config/texts/resource.<lang>.json should also be declared "
                + "in the resource files of the other languages the app offers. The app loads only "
                + "the texts of the user's language, so a key missing from it renders as the bare "
                + "key (or the frontend's built-in text for the keys it ships) — the app runs but "
                + "the translation is incomplete. Reported once per pair of languages, on the "
                + "language of the file that lacks the keys, with how many are missing and the "
                + "first few of them.",
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
                var missing = texts
                    .Ids.Keys.Where(key => !other.Ids.ContainsKey(key))
                    .Order(StringComparer.Ordinal)
                    .ToList();
                if (missing.Count == 0)
                    continue;
                yield return Metadata.Report(
                    Message($"resource.{texts.Language}.json", $"resource.{other.Language}.json", missing),
                    new SourceSpan(other.Position.File, "/language")
                );
            }
        }
    }

    private static string Message(string declaredIn, string missingFrom, List<string> missing) =>
        missing.Count == 1
            ? $"text-resource key \"{missing[0]}\" is declared in {declaredIn} but missing from {missingFrom}"
            : $"{missing.Count} text-resource keys are declared in {declaredIn} but missing from {missingFrom}: {Examples(missing)}";

    private static string Examples(List<string> keys)
    {
        var quoted = keys.Take(ExampleKeyCount).Select(key => $"\"{key}\"").ToList();
        return keys.Count > quoted.Count
            ? $"{string.Join(", ", quoted)} and {keys.Count - quoted.Count} more"
            : $"{string.Join(", ", quoted[..^1])} and {quoted[^1]}";
    }
}
