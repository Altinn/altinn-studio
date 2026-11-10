using Altinn.App.Analyzers.Utils;

namespace Altinn.App.Analyzers.Process;

/// <summary>
/// Checks that every task in <c>config/process/process.bpmn</c> uses the BPMN element its type requires: a
/// service task a <c>bpmn:serviceTask</c>, and every other task a <c>bpmn:task</c>. The app frontend chooses
/// how to show a task from its element, so a mismatch runs on the backend and then breaks the page. This is the
/// build-time front of the startup check in <c>ProcessTaskConfigurationValidationService</c> in Altinn.App.Core.
/// The runtime classifies a type by how its task is registered, which the build cannot see, so this assumes each of
/// the app's own task classes is registered under the interface it implements. A type that is neither built in nor
/// the constant <c>Type</c> of such a class, such as one from a package, is left to the startup check.
/// </summary>
internal static class ProcessTaskElementUtils
{
    /// <summary>Appends a diagnostic for every task whose type is known and whose element does not match it.</summary>
    /// <param name="additionalFiles">The analysis's additional files, which hold the process.</param>
    /// <param name="appServiceTaskTypes">
    /// The constant types of the service task classes in the app's own code.
    /// </param>
    /// <param name="appProcessTaskTypes">
    /// The constant types of the app's own <c>IProcessTask</c> classes that are not service tasks.
    /// </param>
    /// <param name="token">Cancels reading the process.</param>
    /// <param name="diagnostics">Receives the diagnostics.</param>
    internal static void CollectDiagnostics(
        ImmutableArray<AdditionalText> additionalFiles,
        ICollection<string> appServiceTaskTypes,
        ICollection<string> appProcessTaskTypes,
        CancellationToken token,
        List<Diagnostic> diagnostics
    )
    {
        var processFile = ProcessFile.FindSingle(additionalFiles);
        if (processFile is null || ProcessFile.TryParse(processFile, token) is not { } parsed)
        {
            return;
        }

        var (content, document) = parsed;
        foreach (var taskTypeElement in document.Descendants(ProcessFile.Altinn + "taskType"))
        {
            // Compared as written, like the runtime: a type that differs only in whitespace or case resolves to
            // nothing, which the startup check reports instead.
            var taskType = taskTypeElement.Value;
            var task = ProcessFile.FindHostingTask(taskTypeElement);
            if (task?.Attribute("id")?.Value is not { Length: > 0 } taskId)
            {
                continue;
            }

            // A built-in type is classified as built in, whatever app class shares its name: the class may be
            // unregistered, or the built-in may not be enabled, so only the startup check can tell which one runs.
            // Between app classes, a service task wins over a process task of the same type, as in the runtime's
            // lookup.
            bool isServiceTask;
            if (BuiltInTaskTypes.ServiceTasks.Contains(taskType))
            {
                isServiceTask = true;
            }
            else if (BuiltInTaskTypes.ProcessTasks.Contains(taskType))
            {
                isServiceTask = false;
            }
            else if (appServiceTaskTypes.Contains(taskType))
            {
                isServiceTask = true;
            }
            else if (appProcessTaskTypes.Contains(taskType))
            {
                isServiceTask = false;
            }
            else
            {
                continue;
            }

            var isServiceTaskElement = task.Name == ProcessFile.ServiceTask;
            if (isServiceTask == isServiceTaskElement)
            {
                continue;
            }

            diagnostics.Add(
                Diagnostic.Create(
                    Diagnostics.Process.TaskUsesWrongElement,
                    FileLocationHelper.GetXmlElementLocation(processFile, content, task),
                    taskId,
                    taskType,
                    isServiceTask ? "a service task" : "not a service task",
                    isServiceTaskElement ? "bpmn:serviceTask" : "bpmn:task",
                    isServiceTask ? "bpmn:serviceTask" : "bpmn:task"
                )
            );
        }
    }
}
