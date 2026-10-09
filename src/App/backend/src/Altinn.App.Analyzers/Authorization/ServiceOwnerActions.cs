namespace Altinn.App.Analyzers.Authorization;

/// <summary>
/// The authorization actions the app owner (org) must hold in the app's own XACML policy, because
/// the app performs the corresponding operations against Storage as the service owner rather than
/// as the end user. Storage authorizes those calls against this very policy with
/// <c>urn:altinn:org</c> as the subject, so a policy that only grants the end user leaves the app
/// unable to read and write its own instances.
/// </summary>
internal static class ServiceOwnerActions
{
    /// <summary>Actions the app needs in any process state, for reading and writing instance data.</summary>
    internal static readonly string[] Read = ["read"];

    /// <summary>
    /// Actions the app needs to persist instance data. Storage authorizes data operations with a plain
    /// <c>write</c>, so this is unconditional. Process transitions need nothing from the policy: Storage
    /// always allows the app owner to commit them.
    /// </summary>
    internal static readonly string[] Write = ["write"];

    /// <summary>Action required to mark an instance complete (<c>POST instances/{id}/complete</c>).</summary>
    internal static readonly string[] Complete = ["complete"];

    /// <summary>Action required to hard-delete an instance at process end.</summary>
    internal static readonly string[] Delete = ["delete"];

    /// <summary>
    /// Task types whose service task marks the instance complete as the service owner, which
    /// requires the <c>complete</c> action. eFormidling always does this; fiks arkiv does it when
    /// configured to (<c>FiksArkivSettings.SuccessHandling.MarkInstanceComplete</c>), and that
    /// configuration is not visible at build time - it can come from appsettings, environment
    /// variables or code - so the requirement is unconditional for both.
    /// </summary>
    internal static bool MarksInstanceComplete(string taskType) => taskType is "eFormidling" or "fiksArkiv";
}
