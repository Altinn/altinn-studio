using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Ref;

internal sealed class RefDataModelPathRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "REF-DATAMODEL-PATH",
            "Data-model binding path must resolve against its dataType's schema",
            "simpleBinding (and other dataModelBindings values) must reference a "
                + "property path declared in the model schema for the binding's "
                + "effective dataType. The dataType is either explicit (object form) "
                + "or inherited from the layout-set/task. Array-index segments (e.g. "
                + "Group[0].Field) are normalised away, matching how the runtime "
                + "resolves a repeating-group element against the array's items schema.",
            Severity.Error
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        foreach (var u in app.SymbolTable.UnresolvedOf(SymbolKind.DataModelPath))
        {
            if (u.DataModel is not { } facts)
                continue;
            if (facts.EffectiveDataType is null)
            {
                // No specific dataType pinned (ambiguous task, expression outside any layout set):
                // the path was checked against the union and matched nothing.
                yield return UnionMissing(u);
                continue;
            }
            if (!facts.SchemaPresent)
                // No schema for the effective dataType → unverifiable. Skip rather than emit a false
                // "invalid"; REF-DATATYPE-ID / REF-CSHARP-TYPE own the existence signals.
                continue;
            yield return PathMissingInSchema(u, facts.EffectiveDataType);
        }
    }

    private Finding UnionMissing(UnresolvedReference u) =>
        Metadata.Report(
            $"data-model binding \"{u.Value}\" ({u.BindingName} on component \"{u.OwningComponentId}\") does not match any property in the model schema",
            u.Position
        );

    private Finding PathMissingInSchema(UnresolvedReference u, string dataType) =>
        Metadata.Report(
            $"data-model binding \"{u.Value}\" ({u.BindingName} on component \"{u.OwningComponentId}\") is not declared in dataType \"{dataType}\"'s schema ({AppPaths.SchemaFile(dataType)})",
            u.Position
        );
}
