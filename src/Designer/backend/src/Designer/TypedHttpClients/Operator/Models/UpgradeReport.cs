using System.Collections.Generic;

namespace Altinn.Studio.Designer.TypedHttpClients.Operator.Models;

/// <summary>
/// The report of an <c>upgrade-v9</c> run: what <c>studioctl app upgrade v9 --json</c> wrote. Read it from a result
/// with <see cref="RunResult.ReadReport{T}"/>.
/// </summary>
/// <remarks>
/// The report does not say when the upgrade held back layouts that need manual work. The patch then leaves
/// <c>App/ui/layout-sets.json</c> in the app, and the upgrade is not done, so apply all of the patch or none of it.
/// </remarks>
/// <param name="ExitCode">What the upgrade did. <see cref="Outcome"/> says it in words.</param>
/// <param name="Message">A summary from studioctl, such as <c>upgrade completed</c>.</param>
/// <param name="Error">Why the upgrade failed, when studioctl knows. Empty otherwise.</param>
/// <param name="Steps">The steps of the upgrade, in order. Null when studioctl stopped before the first step.</param>
internal sealed record UpgradeReport(int ExitCode, string? Message, string? Error, IReadOnlyList<UpgradeStep>? Steps)
{
    /// <summary>What <see cref="ExitCode"/> means.</summary>
    public UpgradeOutcome Outcome =>
        ExitCode switch
        {
            0 => UpgradeOutcome.Upgraded,
            2 => UpgradeOutcome.UnsupportedVersion,
            3 => UpgradeOutcome.UpgradedWithManualSteps,
            _ => UpgradeOutcome.Failed,
        };
}

/// <summary>
/// One step of an upgrade, such as <c>Project file</c>, with what it did.
/// </summary>
internal sealed record UpgradeStep(string Name, IReadOnlyList<UpgradeMessage> Messages);

/// <summary>
/// One thing a step did or found.
/// </summary>
/// <param name="Text">What happened, for a person to read.</param>
/// <param name="Status">
/// One of the values in <see cref="UpgradeMessageStatus"/>. A string, so that a status a newer studioctl adds does not
/// make the report unreadable.
/// </param>
internal sealed record UpgradeMessage(string Text, string Status);

/// <summary>
/// The statuses of <see cref="UpgradeMessage.Status"/>.
/// </summary>
internal static class UpgradeMessageStatus
{
    /// <summary>The step changed the app, or a check passed.</summary>
    public const string Ok = "OK";

    /// <summary>Information for the developer of the app.</summary>
    public const string Info = "INFO";

    /// <summary>The app did not need the step.</summary>
    public const string Skip = "SKIP";

    /// <summary>Something the developer should look at.</summary>
    public const string Warn = "WARN";

    /// <summary>Something the developer must finish by hand.</summary>
    public const string Todo = "TODO";

    /// <summary>The step tried and failed.</summary>
    public const string Fail = "FAIL";
}

/// <summary>
/// What an upgrade did, from <see cref="UpgradeReport.ExitCode"/>.
/// </summary>
internal enum UpgradeOutcome
{
    /// <summary>The upgrade applied cleanly.</summary>
    Upgraded,

    /// <summary>The upgrade applied, and the <see cref="UpgradeMessageStatus.Todo"/> messages are left to do.</summary>
    UpgradedWithManualSteps,

    /// <summary>The app is not on a version that the upgrade starts from.</summary>
    UnsupportedVersion,

    /// <summary>The upgrade failed.</summary>
    Failed,
}
