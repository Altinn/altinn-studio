using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Shape;

internal sealed class ProcessTaskTypeRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "PROCESS-TASK-TYPE",
            "altinn:taskType should be a known task type",
            "A task's <altinn:taskType> drives which engine handlers run (data, signing, "
                + "payment, confirmation, feedback, pdf, eFormidling, fiksArkiv, subformPdf). "
                + "A value outside that set only works if the app registers a custom IProcessTask "
                + "for it, which can't be seen statically — so an unrecognised type (typically a "
                + "typo like \"signign\") is reported as a warning, not an error.",
            Severity.Warning
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        foreach (var task in app.Tasks)
        {
            // Empty taskType is the missing-taskType coverage gap's concern, not this rule's.
            if (string.IsNullOrEmpty(task.TaskType) || ProcessTaskTypes.All.Contains(task.TaskType))
                continue;
            yield return Metadata.Report(
                $"task \"{task.Id}\" has altinn:taskType \"{task.TaskType}\", which is not a built-in task type; "
                    + "unless a custom IProcessTask handles it, the runtime will not process the task",
                task.Position
            );
        }
    }
}
