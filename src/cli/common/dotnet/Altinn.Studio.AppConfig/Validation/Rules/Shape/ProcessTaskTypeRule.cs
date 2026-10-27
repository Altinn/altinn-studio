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
                + "or IServiceTask whose Type matches it. Types returned by such classes in the app's "
                + "own code are accepted; one registered by a referenced package can't be seen "
                + "statically — so an unrecognized type (typically a misspelling) is reported as a "
                + "warning, not an error.",
            Severity.Warning
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        foreach (var task in app.Tasks)
        {
            // Empty taskType is the missing-taskType coverage gap's concern, not this rule's.
            if (
                string.IsNullOrEmpty(task.TaskType)
                || ProcessTaskTypes.All.Contains(task.TaskType)
                || app.CustomTaskTypes.Contains(task.TaskType)
            )
                continue;
            yield return Metadata.Report(
                $"task \"{task.Id}\" has altinn:taskType \"{task.TaskType}\", which is neither a built-in task type "
                    + "nor the Type of an IProcessTask or IServiceTask class in the app; unless a referenced "
                    + "package registers one for it, the runtime will not process the task",
                task.Position
            );
        }
    }
}
