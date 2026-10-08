using Altinn.Studio.AppConfig.Models;
using Altinn.Studio.AppConfig.Validation.Rules.Cross;

namespace Altinn.Studio.AppConfig.Validation.Rules.Shape;

internal sealed class DataTypeCountRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "DATATYPE-COUNT",
            "dataType maxCount/minCount must be consistent",
            "A form data type (one with appLogic.classRef) that a layout or expression reads — "
                + "a folder's defaultDataType, or the dataType of a data model binding or dataModel "
                + "expression — must have maxCount 1: the runtime only reads single-instance data as "
                + "that form's data, so a different maxCount makes the model unusable there. Form data "
                + "types nothing reads that way are exempt, since app code may create and read several "
                + "elements of them. Subform data types (the defaultDataType of a folder that a Subform "
                + "component's layoutSet points at) are exempt, since each subform entry is its own "
                + "data element, and so are the candidates CROSS-SUBFORM-HAS-DATATYPE names for a "
                + "Subform folder without one. And minCount must not exceed a positive maxCount, which "
                + "would be an unsatisfiable range (maxCount 0 means unbounded).",
            Severity.Error
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        var maxCountExempt = new HashSet<string>(app.SubformDataTypes(), StringComparer.Ordinal);
        maxCountExempt.UnionWith(CrossSubformHasDataTypeRule.CandidateDataTypes(app).Select(dt => dt.Id));
        var readAsForm = DataTypesReadAsForm(app);
        foreach (var dt in app.DataTypes)
        {
            // An absent maxCount defaults to 1 (the application-metadata schema default),
            // which is valid for form data — so only an EXPLICIT non-1 maxCount is wrong.
            if (
                dt.IsForm
                && readAsForm.Contains(dt.Id)
                && !maxCountExempt.Contains(dt.Id)
                && dt.MaxCount is int max
                && max != 1
            )
                yield return Metadata.Report(
                    $"data type \"{dt.Id}\" has appLogic (form data) and a layout or expression reads it, but maxCount={max}; form data types read that way must have maxCount 1 unless they are the defaultDataType of a Subform folder",
                    dt.Position
                );

            // maxCount 0 means unbounded; an absent minCount defaults to 0.
            if (dt.MaxCount is int bound && bound > 0 && (dt.MinCount ?? 0) > bound)
                yield return Metadata.Report(
                    $"data type \"{dt.Id}\" has minCount {dt.MinCount} greater than maxCount {bound} (unsatisfiable)",
                    dt.Position
                );
        }
    }

    private static HashSet<string> DataTypesReadAsForm(AppModel app)
    {
        var read = new HashSet<string>(StringComparer.Ordinal);
        foreach (var set in app.LayoutSets)
            if (set.DefaultDataReq is { } dataType)
                read.Add(dataType.Value);
        foreach (var reference in app.Refs.DataModel)
            if (reference.ExplicitDataType is { Length: > 0 } dataType)
                read.Add(dataType);
        return read;
    }
}
