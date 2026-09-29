using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Cross;

internal sealed class CrossTaskHasDataTypeRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "CROSS-TASK-HAS-DATATYPE",
            "Every BPMN data task should have at least one dataType bound to it",
            "If a BPMN task has altinn:taskType=data, there should be at least one "
                + "applicationmetadata.dataTypes[] entry whose taskId points at it; otherwise "
                + "the task has nothing to fill in at runtime. Other task types (signing, payment, ...) "
                + "may legitimately have no dataType.",
            Severity.Warning
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        var referenced = new HashSet<string>(StringComparer.Ordinal);
        foreach (var dt in app.DataTypes)
        {
            if (!string.IsNullOrEmpty(dt.TaskId))
                referenced.Add(dt.TaskId);
        }
        foreach (var t in app.Tasks)
        {
            if (t.TaskType != ProcessTaskTypes.Data)
                continue;
            if (referenced.Contains(t.Id))
                continue;
            yield return Metadata.Report(
                $"BPMN data task \"{t.Id}\" has no dataType in applicationmetadata.json pointing at it",
                t.Position
            );
        }
    }
}
