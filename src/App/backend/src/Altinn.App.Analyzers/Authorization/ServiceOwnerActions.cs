namespace Altinn.App.Analyzers.Authorization;

/// <summary>
/// The authorization actions the app owner (org) must hold in the app's own XACML policy, because
/// the app performs the corresponding operations against Storage as the service owner rather than
/// as the end user. Storage authorizes those calls against this very policy with
/// <c>urn:altinn:org</c> as the subject, so a policy that only grants the end user leaves the app
/// unable to advance its own process.
/// </summary>
/// <remarks>
/// <see cref="ProcessNextActionsForTaskType"/> mirrors
/// <c>ProcessEngineAuthorizer.GetActionsThatAllowProcessNextForTaskType</c> in Altinn.App.Core
/// (itself a mirror of <c>ProcessAuthorizer</c> in altinn-storage, which is what actually decides).
/// The mirror is pinned by <c>ServiceOwnerActionsTests.ProcessNextActions_Match_ProcessEngineAuthorizer</c>
/// - keep the two in sync there rather than by inspection.
/// </remarks>
internal static class ServiceOwnerActions
{
    /// <summary>Actions the app needs in any process state, for reading and writing instance data.</summary>
    internal static readonly string[] Read = ["read"];

    /// <summary>
    /// Actions the app needs to persist data and process transitions. Storage authorizes data
    /// operations with a plain <c>write</c> (no task-type mapping), so this is unconditional.
    /// </summary>
    internal static readonly string[] Write = ["write"];

    /// <summary>Action required to mark an instance complete (<c>POST instances/{id}/complete</c>).</summary>
    internal static readonly string[] Complete = ["complete"];

    /// <summary>Action required to hard-delete an instance at process end.</summary>
    internal static readonly string[] Delete = ["delete"];

    /// <summary>Action Storage requires when a transition abandons the current task.</summary>
    internal static readonly string[] Reject = ["reject"];

    /// <summary>
    /// Task types whose transitions are authorized by <c>write</c>, and therefore need nothing
    /// beyond <see cref="Write"/>. Derived from <see cref="ProcessNextActionsForTaskType"/> so the
    /// two can never disagree.
    /// </summary>
    internal static bool IsCoveredByWrite(string taskType) =>
        Array.IndexOf(ProcessNextActionsForTaskType(taskType), "write") >= 0;

    /// <summary>
    /// The actions that allow a process transition out of a task of the given type. Storage permits
    /// the transition when the subject holds <em>any</em> of them.
    /// </summary>
    internal static string[] ProcessNextActionsForTaskType(string taskType) =>
        taskType switch
        {
            "data" or "feedback" or "pdf" or "eFormidling" or "fiksArkiv" or "subformPdf" => ["write"],
            "payment" => ["pay", "write"],
            "confirmation" => ["confirm"],
            "signing" => ["sign", "write"],
            _ => [taskType],
        };

    /// <summary>
    /// Task types whose service task marks the instance complete as the service owner, which
    /// requires the <c>complete</c> action. eFormidling always does this; fiks arkiv does it when
    /// configured to (<c>FiksArkivSettings.SuccessHandling.MarkInstanceComplete</c>), and that
    /// configuration is not visible at build time - it can come from appsettings, environment
    /// variables or code - so the requirement is unconditional for both.
    /// </summary>
    internal static bool MarksInstanceComplete(string taskType) => taskType is "eFormidling" or "fiksArkiv";
}
