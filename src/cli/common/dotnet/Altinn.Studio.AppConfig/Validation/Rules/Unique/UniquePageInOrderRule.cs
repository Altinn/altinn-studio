using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Unique;

internal sealed class UniquePageInOrderRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "UNIQUE-PAGE-IN-ORDER",
            "A page must appear at most once in a layout-set's page order",
            "Settings.pages.order (and pages.groups[].order) list each page once. A page "
                + "listed twice — usually a copy-paste slip — renders or navigates to the "
                + "same layout more than once.",
            Severity.Error
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        var seen = new HashSet<(string Set, string Page)>();
        foreach (var r in app.Refs.PageFiles)
        {
            // pdfLayoutName may legitimately reuse an ordered page name; only ordered pages
            // (pages.order / pages.groups[].order) must be unique.
            if (!r.Ordered)
                continue;
            var setId = AppPaths.SetIdOf(r.Position.File);
            if (seen.Add((setId, r.Value)))
                continue;
            yield return Metadata.Report(
                $"page \"{r.Value}\" is listed more than once in the page order of layout-set \"{setId}\"",
                r.Position
            );
        }
    }
}
