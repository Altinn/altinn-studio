using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Completeness;

internal sealed class UnusedLayoutFolderRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "UNUSED-LAYOUT-FOLDER",
            "A layout folder must be reachable",
            "A folder under App/ui/ is rendered only when its name matches a process task, a "
                + "Subform.layoutSet, the stateless onEntry.show, or CustomReceipt. One matching none "
                + "of these is never rendered — often a leftover or a name out of sync with its task.",
            Severity.Warning
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        foreach (var set in app.LayoutSets)
        {
            if (app.FolderRole(set) != LayoutFolderRole.Unused)
                continue;
            yield return Metadata.Report(
                $"layout folder \"{set.Id}\" is not referenced by any process task, Subform, "
                    + "onEntry, or CustomReceipt — it is never rendered",
                set.Position
            );
        }
    }
}
