using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Unique;

internal sealed class UniqueComponentIdRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "UNIQUE-COMPONENT-ID",
            "Component ids must be unique within a layout-set",
            "Two or more components in the same layout-set share an id. The frontend reads the "
                + "layout-set's pages sorted by file name (whole-number names first, in numeric order), "
                + "not in pages.order, keeps the first component with each id and silently removes the "
                + "later ones.",
            Severity.Error
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        // A component id declared twice in a set is a Symbol (scoped to the set) with >1
        // declaration. Skip empty-name ids: the resolver still declares them, but a blank id is
        // not a real collision (REQUIRED-* covers it) — matching the old skip-empty-id guard.
        foreach (var (id, spans) in app.SymbolTable.DuplicatesOf(SymbolKind.Component))
        {
            if (string.IsNullOrEmpty(id.Value))
                continue;
            var first = spans[0];
            for (var i = 1; i < spans.Count; i++)
                yield return Metadata.Report(
                    $"component id \"{id.Value}\" is declared more than once in layout-set \"{id.Scope}\" (first at {first})",
                    spans[i]
                );
        }
    }
}
