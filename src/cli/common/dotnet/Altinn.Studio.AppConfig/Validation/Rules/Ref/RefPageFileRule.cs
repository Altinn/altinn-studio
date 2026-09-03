using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Ref;

internal sealed class RefPageFileRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "REF-PAGE-FILE",
            "Settings page must have a layout file",
            "Each entry in Settings.pages.order (or pages.groups[].order) must have a "
                + "matching <page>.json under ui/<task>/layouts/.",
            Severity.Error
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        foreach (var u in app.SymbolTable.UnresolvedOf(SymbolKind.Page))
        {
            // A cross-task page target (Summary2 target of type "page" with a taskId) resolves
            // against that task's layout-set; when none is bound it's unverifiable, so skip.
            if (!u.ScopeExists)
                continue;
            yield return Metadata.Report(
                $"page \"{u.Value}\" in task \"{u.Scope}\" has no layout file at {Path.Combine(u.Scope, "layouts", u.Value + ".json")}",
                u.Position
            );
        }
    }
}
