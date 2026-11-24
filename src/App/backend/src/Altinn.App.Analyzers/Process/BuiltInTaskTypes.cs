namespace Altinn.App.Analyzers.Process;

/// <summary>
/// The task types the app libraries implement themselves, by whether they are service tasks. The analyzer
/// targets netstandard2.0 and cannot reference Altinn.App.Core, so the lists are copied; they are pinned to the
/// built-in implementations by <c>BuiltInTaskTypesTests</c>.
/// </summary>
internal static class BuiltInTaskTypes
{
    /// <summary>
    /// Types implemented as <c>IServiceTask</c>, declared as a <c>bpmn:serviceTask</c> element.
    /// </summary>
    internal static readonly ImmutableHashSet<string> ServiceTasks = ImmutableHashSet.Create(
        StringComparer.Ordinal,
        "pdf",
        "subformPdf",
        "eFormidling",
        "fiksArkiv"
    );

    /// <summary>
    /// Service task types whose stages only return <c>ServiceTaskResult.Completed()</c>, so the task always ends with
    /// no action. fiksArkiv is not one: it ends the task with the actions its settings configure.
    /// </summary>
    internal static readonly ImmutableHashSet<string> ServiceTasksWithoutAction = ImmutableHashSet.Create(
        StringComparer.Ordinal,
        "pdf",
        "subformPdf",
        "eFormidling"
    );

    /// <summary>
    /// Types implemented as an <c>IProcessTask</c> that is not a service task, declared as a <c>bpmn:task</c> element.
    /// </summary>
    internal static readonly ImmutableHashSet<string> ProcessTasks = ImmutableHashSet.Create(
        StringComparer.Ordinal,
        "data",
        "confirmation",
        "feedback",
        "signing",
        "payment"
    );
}
