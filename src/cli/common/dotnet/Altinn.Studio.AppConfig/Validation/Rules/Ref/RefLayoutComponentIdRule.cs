using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Ref;

internal sealed class RefLayoutComponentIdRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "REF-LAYOUT-COMPONENT-ID",
            "Component-id reference must resolve",
            "Fields that reference another component by id (Group.children, "
                + "Summary.componentRef, ['component', id] in expressions) must point to a "
                + "component that exists in the same layout-set.",
            Severity.Error
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        foreach (var u in app.SymbolTable.UnresolvedOf(SymbolKind.Component))
        {
            // A cross-task reference (Summary2 target/override with an explicit taskId) resolves
            // against that task's layout-set; when none is bound it's unverifiable, so skip rather
            // than mislead (REF-TASK-ID reports the bad task id).
            if (!u.ScopeExists)
                continue;
            yield return Metadata.Report(
                $"component \"{u.Value}\" does not exist in layout-set \"{u.Scope}\" (referenced from \"{u.OwningComponentId}\")",
                u.Position
            );
        }
    }
}
