using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Shape;

internal sealed class DataTypeCountRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "DATATYPE-COUNT",
            "dataType maxCount/minCount must be consistent",
            "A form data type (one with appLogic.classRef) must have maxCount 1 — the runtime "
                + "only treats single-instance data as form data, so a different maxCount makes "
                + "the model unusable. And minCount must not exceed a positive maxCount, which "
                + "would be an unsatisfiable range (maxCount 0 means unbounded).",
            Severity.Error
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        foreach (var dt in app.DataTypes)
        {
            // An absent maxCount defaults to 1 (the application-metadata schema default),
            // which is valid for form data — so only an EXPLICIT non-1 maxCount is wrong.
            if (dt.IsForm && dt.MaxCount is int max && max != 1)
                yield return Metadata.Report(
                    $"data type \"{dt.Id}\" has appLogic (form data) but maxCount={max}; form data types must have maxCount 1",
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
}
