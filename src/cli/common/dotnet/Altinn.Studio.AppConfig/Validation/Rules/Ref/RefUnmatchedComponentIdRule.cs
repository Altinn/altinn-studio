using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Ref;

internal sealed class RefUnmatchedComponentIdRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "REF-UNMATCHED-COMPONENT-ID",
            "Component-id overrides and exclusions should match a component",
            "Summary2 overrides, Settings.json components.excludeFromPdf, Summary excludedChildren and "
                + "RepeatingGroup tableColumns adjust components the frontend already renders: it looks each "
                + "entry up by id and ignores one that matches no component in the layout-set. Such an entry "
                + "has no effect, which usually means a typo or a component that was renamed or removed. A "
                + "Summary2 override may also name a component in a folder that a Subform component in that "
                + "layout-set points at. Warning, because the app still renders.",
            Severity.Warning
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        foreach (var u in app.SymbolTable.UnresolvedOf(SymbolKind.Component))
        {
            // A cross-task override (Summary2 with an explicit taskId) resolves against that task's
            // layout-set; when none is bound it's unverifiable, so skip rather than mislead.
            if (!u.ScopeExists || u.ComponentRole == ComponentIdRole.Target)
                continue;
            yield return Metadata.Report(
                $"component \"{u.Value}\" does not exist in layout-set \"{u.Scope}\", so the "
                    + $"{EntryName(u.ComponentRole)} has no effect{ReferenceSource.ReferencedFrom(u.OwningComponentId)}",
                u.Position
            );
        }
    }

    private static string EntryName(ComponentIdRole role) =>
        role switch
        {
            ComponentIdRole.SummaryOverride => "override",
            ComponentIdRole.ExcludeFromPdf => "components.excludeFromPdf entry",
            ComponentIdRole.ExcludedChild => "excludedChildren entry",
            ComponentIdRole.TableColumn => "tableColumns entry",
            _ => "entry",
        };
}
