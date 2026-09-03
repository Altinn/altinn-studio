using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Ref;

internal sealed class RefDataTypeIdRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "REF-DATATYPE-ID",
            "DataType reference must resolve",
            "Settings.defaultDataType, the dataType "
                + "of an object-form dataModelBinding, and the signing/payment dataType "
                + "ids in process.bpmn task extensions must reference a dataType id "
                + "declared in applicationmetadata.json.",
            Severity.Error
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        foreach (var u in app.SymbolTable.UnresolvedOf(SymbolKind.DataType))
            yield return Metadata.Report(
                $"dataType \"{u.Value}\" is not declared in applicationmetadata.json",
                u.Position
            );
    }
}
