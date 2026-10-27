using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Ref;

internal sealed class RefTaskIdRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "REF-TASK-ID",
            "Task-id reference must resolve",
            "applicationmetadata dataTypes[].taskId and Summary2 target.taskId "
                + "must reference a task that exists in process.bpmn.",
            Severity.Error
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        foreach (var u in app.SymbolTable.UnresolvedOf(SymbolKind.Task))
            yield return Metadata.Report($"task \"{u.Value}\" does not exist in process.bpmn", u.Position);
    }
}
