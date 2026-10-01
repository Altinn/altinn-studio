namespace Altinn.App.Analyzers.Process;

/// <summary>
/// The task types the app libraries implement themselves, by whether they are service tasks. The analyzer
/// targets netstandard2.0 and cannot reference Altinn.App.Core, so the lists are copied; they are pinned to the
/// built-in implementations by <c>BuiltInTaskTypesTests</c>.
/// </summary>
internal static class BuiltInTaskTypes
{
    /// <summary>
    /// Types implemented as <c>IServiceTask</c> or <c>IPipelineServiceTask</c>, declared as a <c>bpmn:serviceTask</c> element.
    /// </summary>
    internal static readonly ImmutableHashSet<string> ServiceTasks = ImmutableHashSet.Create(
        StringComparer.Ordinal,
        "pdf",
        "subformPdf",
        "eFormidling",
        "fiksArkiv"
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
