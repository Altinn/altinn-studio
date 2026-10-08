using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Completeness;

internal sealed class MultilingualCompletenessRule : IValidationRule
{
    private const string InboxTitleTextKey = "dp.title";
    private const string InboxDefaultLanguage = "nb";
    private static readonly string[] _inboxLanguages = ["nb", "nn", "en"];

    public RuleMetadata Metadata { get; } =
        new(
            "MULTILINGUAL-COMPLETENESS",
            "App languages should have a title in applicationmetadata",
            "Altinn's inbox shows the applicationmetadata title in the user's language, which is "
                + "nb, nn or en, falling back to the nb title and then the first one. When the app "
                + "offers one of these languages through config/texts/resource.<lang>.json but the "
                + "title has no entry for it, inbox users of that language see the title in another "
                + "language. Not reported when a resource file declares dp.title, which the inbox "
                + "shows instead of the title.",
            Severity.Info
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        var inboxTexts = app.LanguageTextResources().Where(t => _inboxLanguages.Contains(t.Language)).ToList();
        if (inboxTexts.Any(DeclaresInboxTitle))
            yield break;

        var fallback = InboxFallbackTitle(app.TitleLanguages);
        foreach (var lang in inboxTexts.Select(t => t.Language).Order(StringComparer.Ordinal))
        {
            if (app.TitleLanguages.Contains(lang))
                continue;
            yield return Metadata.Report(
                fallback is null
                    ? $"language \"{lang}\" has config/texts/resource.{lang}.json but applicationmetadata.json has no title, so Altinn's inbox has no title to show \"{lang}\" users"
                    : $"language \"{lang}\" has config/texts/resource.{lang}.json but no title in applicationmetadata.json, so Altinn's inbox shows the \"{fallback}\" title to \"{lang}\" users",
                new SourceSpan("App/config/applicationmetadata.json", "/title", Key: true)
            );
        }
    }

    private static bool DeclaresInboxTitle(TextResources texts) =>
        texts.Values.TryGetValue(InboxTitleTextKey, out var value) && !string.IsNullOrWhiteSpace(value);

    private static string? InboxFallbackTitle(IReadOnlyList<string> titleLanguages)
    {
        if (titleLanguages.Contains(InboxDefaultLanguage))
            return InboxDefaultLanguage;
        return titleLanguages.Count > 0 ? titleLanguages[0] : null;
    }
}
