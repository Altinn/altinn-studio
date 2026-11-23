namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// The task types the v9 app libraries implement themselves: a copy of <c>BuiltInTaskTypes</c> in
/// Altinn.App.Analyzers, which tests pin to the built-in task classes. Compared as written, like the v9 app.
/// </summary>
internal static class BuiltInTaskTypes
{
    /// <summary>
    /// Types implemented as service tasks.
    /// </summary>
    internal static readonly IReadOnlySet<string> ServiceTasks = new HashSet<string>(StringComparer.Ordinal)
    {
        "pdf",
        "subformPdf",
        "eFormidling",
        "fiksArkiv",
    };

    /// <summary>
    /// Types implemented as process tasks that are not service tasks.
    /// </summary>
    internal static readonly IReadOnlySet<string> ProcessTasks = new HashSet<string>(StringComparer.Ordinal)
    {
        "data",
        "confirmation",
        "feedback",
        "signing",
        "payment",
    };

    /// <summary>
    /// The type of the task the app runs for a task without a type.
    /// </summary>
    internal const string NullType = "NullType";
}
