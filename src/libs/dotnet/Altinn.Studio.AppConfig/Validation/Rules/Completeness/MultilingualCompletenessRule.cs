using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Completeness;

internal sealed class MultilingualCompletenessRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "MULTILINGUAL-COMPLETENESS",
            "Configured languages should each have a resource file",
            "Languages used in applicationmetadata (title etc.) should have a corresponding "
                + "config/texts/resource.<lang>.json file. Missing files mean users in that language "
                + "see a fallback (nb) or the bare key.",
            Severity.Warning
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        var have = new HashSet<string>(app.TextResources.Select(tr => tr.Language), StringComparer.Ordinal);
        foreach (var lang in app.DeclaredLanguages())
        {
            if (have.Contains(lang))
                continue;
            yield return Metadata.Report(
                $"language \"{lang}\" is declared in applicationmetadata but has no config/texts/resource.{lang}.json",
                new SourceSpan("App/config/applicationmetadata.json", "")
            );
        }
    }
}
