using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Ref;

internal sealed class RefLayoutSetRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "REF-LAYOUT-SET",
            "Layout-set reference must resolve",
            "applicationmetadata.onEntry.show and Subform.layoutSet must reference a "
                + "layout set that exists — a folder under App/ui/.",
            Severity.Error
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        foreach (var u in app.SymbolTable.UnresolvedOf(SymbolKind.LayoutSet))
            yield return Metadata.Report($"layout-set \"{u.Value}\" does not exist", u.Position);
    }
}
