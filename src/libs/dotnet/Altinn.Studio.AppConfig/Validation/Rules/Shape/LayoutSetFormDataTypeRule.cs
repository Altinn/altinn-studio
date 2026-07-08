using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Shape;

internal sealed class LayoutSetFormDataTypeRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "LAYOUTSET-FORM-DATATYPE",
            "A layout folder's data type must be a form data type",
            "A layout folder binds its components to a data model, so its "
                + "Settings.defaultDataType must be a form data type — one declaring "
                + "appLogic.classRef. Pointing at a non-form type (a PDF, attachment or "
                + "signature data type) leaves the bindings with no model.",
            Severity.Error
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        var byId = new Dictionary<string, DataType>(StringComparer.Ordinal);
        foreach (var dt in app.DataTypes)
            byId[dt.Id] = dt; // duplicate ids are UNIQUE-DATATYPE-ID's concern

        foreach (var set in app.LayoutSets)
        {
            if (set.DefaultDataReq is { } dr)
                foreach (var f in CheckRef(byId, dr.Value, dr.Position))
                    yield return f;
        }
    }

    private IEnumerable<Finding> CheckRef(Dictionary<string, DataType> byId, string id, SourceSpan pos)
    {
        // Skip empty (implicit sets) and missing ids (REF-DATATYPE-ID owns those).
        if (!string.IsNullOrEmpty(id) && byId.TryGetValue(id, out var dt) && !dt.IsForm)
            yield return Metadata.Report(
                $"data type \"{id}\" is used as a layout-set model but is not a form data type (no appLogic.classRef)",
                pos
            );
    }
}
