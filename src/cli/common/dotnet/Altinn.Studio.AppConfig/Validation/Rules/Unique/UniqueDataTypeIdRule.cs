using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Unique;

internal sealed class UniqueDataTypeIdRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "UNIQUE-DATATYPE-ID",
            "DataType ids must be unique in applicationmetadata",
            "applicationmetadata.dataTypes[].id must be unique within the document. "
                + "Duplicate ids result in the second entry silently shadowing the first depending on iteration order.",
            Severity.Error
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        // A dataType id declared twice is an app-global Symbol with >1 declaration; each
        // declaration span is its /dataTypes/{i}/id position. Skip empty-name ids (the resolver
        // still declares them) — matching the old skip-empty-id guard.
        foreach (var (id, spans) in app.SymbolTable.DuplicatesOf(SymbolKind.DataType))
        {
            if (string.IsNullOrEmpty(id.Value))
                continue;
            for (var i = 1; i < spans.Count; i++)
                yield return Metadata.Report(
                    $"dataType id \"{id.Value}\" is declared more than once in applicationmetadata.json",
                    spans[i]
                );
        }
    }
}
