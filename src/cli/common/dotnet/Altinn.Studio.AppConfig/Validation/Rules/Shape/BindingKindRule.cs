using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Shape;

internal sealed class BindingKindRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "BINDING-KIND",
            "A data-model binding must match the schema type of its kind",
            "A repeating-group 'group' binding must reference an array in the model schema; "
                + "a 'simpleBinding' (single-value component) should reference a scalar, not an "
                + "array. A kind mismatch resolves to a real property but reads/writes the wrong "
                + "shape at runtime.",
            Severity.Error
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        // REF-DATAMODEL-PATH owns the missing-path / missing-schema cases; BINDING-KIND only fires
        // when the path resolves in the binding's SPECIFIC effective schema — the union would
        // silently approve a same-name path whose type differs in another model.
        foreach (var rb in app.SymbolTable.Bindings)
        {
            if (rb.EffectiveDataType is null || rb.Props is null)
                continue;
            if (!ModelPath.TryResolveType(rb.Props, rb.Reference.Value, out var type))
                continue;
            // "unknown" means the schema declares the path but not a concrete type the parser could
            // pin (a oneOf/anyOf-wrapped shape, an external $ref). Firing on that is a guess — only
            // report a kind mismatch when the resolved type is a definite non-array.
            if (string.Equals(type, "unknown", StringComparison.Ordinal))
                continue;
            var r = rb.Reference;

            if (string.Equals(r.BindingName, "group", StringComparison.Ordinal) && type != "array")
            {
                yield return Metadata.Report(
                    $"repeating-group binding \"{r.Value}\" on component \"{r.OwningComponentId}\" is {type}, not an array (dataType \"{rb.EffectiveDataType}\")",
                    r.Position
                );
            }
            else if (
                string.Equals(r.BindingName, "simpleBinding", StringComparison.Ordinal)
                && type == "array"
                && !IsMultiValueComponent(r.OwningComponentType)
            )
            {
                // Multi-value components are exempt (they bind an array via simpleBinding by design).
                yield return Metadata.Report(
                    $"simpleBinding \"{r.Value}\" on component \"{r.OwningComponentId}\" ({r.OwningComponentType}) references an array; a single-value binding should reference a scalar (dataType \"{rb.EffectiveDataType}\")",
                    r.Position,
                    Severity.Warning
                );
            }
        }
    }

    // Components that bind a simpleBinding to an array by design (the selected values are a collection).
    private static readonly HashSet<string> _multiValueComponents = new(StringComparer.Ordinal)
    {
        "Checkboxes",
        "MultipleSelect",
    };

    private static bool IsMultiValueComponent(string type) => _multiValueComponents.Contains(type);
}
