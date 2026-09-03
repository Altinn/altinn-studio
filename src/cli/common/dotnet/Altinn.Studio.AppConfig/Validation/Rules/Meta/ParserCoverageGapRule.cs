using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Meta;

internal sealed class ParserCoverageGapRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "PARSER-COVERAGE-GAP",
            "Parser intentionally did not model this construct",
            "The validator's parser encountered a construct it does not yet model. The "
                + "construct is reported as an info finding so developers know which parts of "
                + "their config the validator can't reason about, and maintainers know which "
                + "parser extensions are worth prioritizing. Kinds include: bpmn.userTask, "
                + "bpmn.callActivity, bpmn.subProcess, bpmn.missingTaskType, csharp.record, "
                + "csharp.struct, csharp.interface, settings.pages.unknownShape, layouts.orphanFile.",
            Severity.Info
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        foreach (var note in app.ParserNotes)
        {
            yield return Metadata.Report($"parser does not model {note.Kind}: {note.Detail}", note.Position);
        }
    }
}
