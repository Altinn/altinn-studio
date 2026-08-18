using WorkflowEngine.Core.Constants;
using WorkflowEngine.Models;

namespace WorkflowEngine.Core.Tests;

/// <summary>
/// Tripwire for the cross-component invariant that bounds how long the engine may keep a workflow
/// alive: AppCommand callback tokens are minted once at enqueue and never refresh, so every callback
/// the engine will ever make has to happen inside the signing app-code's remaining validity.
/// </summary>
/// <remarks>
/// The engine cannot read that validity: it is an operator property of the app-code rotation policy,
/// implemented in <c>src/Runtime/operator/internal/controller/appcodesync/controller.go</c> (186d
/// acceptance, 72d rotation), which guarantees a token has at least 186 − 72 = 114 days left when it is
/// minted. So the invariant is asserted against that floor as a named constant, and a change to the
/// controller's constants has this file as its grep target.
/// <para>
/// These tests exist to make the failure mode <em>loud</em>: raising the wait budget, the mailbox
/// timeout, or the retention period pushes the worst-case lifetime past the floor, and the only symptom
/// in production would be receive workflows failing to authenticate weeks after enqueue, long after
/// whoever changed the number had moved on. Raising any of them for real means giving the callback token
/// a refresh path first.
/// </para>
/// <para>
/// The headroom this leaves is what pays for a mailbox timeout far above the roughly one week an
/// <em>inherited</em> callback token would force, and the receiver-enqueue anchor below is what earns
/// it. That payoff is not asserted separately — it is a consequence of the exact arithmetic pinned
/// here, and a test for it could not fail without this one failing first.
/// </para>
/// </remarks>
public class CallbackTokenLifetimeInvariantTests
{
    /// <summary>
    /// Remaining validity guaranteed for a freshly minted callback token: the operator's app-code
    /// acceptance window (186d) minus its rotation interval (72d).
    /// </summary>
    private static readonly TimeSpan _guaranteedTokenValidityAtEnqueue = TimeSpan.FromDays(114);

    /// <summary>
    /// The worst-case lifetime of a receive workflow, measured from the moment its own callback token is
    /// minted — its enqueue. In order: it is enqueued against a mailbox that has just been minted and
    /// parks for the mailbox's entire lifetime; the closure sweep's cadence elapses before the mailbox
    /// actually closes; the released receiver runs and waits out a full step wait budget; it fails, sits
    /// until the terminal-retention edge, and is resumed there — replaying the original token; it waits
    /// out a second full budget; and finally it exhausts its retry ladder.
    /// </summary>
    /// <remarks>
    /// The anchor is what makes this arithmetic different from an inherited-token design's, and the
    /// difference is worth stating because it is the entire justification for
    /// <see cref="EngineSettings.MaxMailboxTimeout"/> being as large as it is. A receive workflow is an
    /// ordinary workflow with its own enqueue, so it carries a <em>fresh</em> token rather than an
    /// ancestor's: no wait an ancestor spent before the receiver existed counts here, and a relay's next
    /// hop is a new workflow with a new token rather than a second term on this one. What an
    /// inherited-token design has to leave outside its bound — the awaiting party's own wait clock — is
    /// inside this one, because these are the receiver's own steps on the receiver's own token.
    /// <para>
    /// One looseness is left uncounted, deliberately, and it predates mailboxes: the wait budget is per
    /// step, so a receiver with several deferring steps spends more than the single budget counted per
    /// run here. That is the generic pipeline looseness every workflow already has, not a term this
    /// design introduces.
    /// </para>
    /// <para>
    /// <strong>The sweep term is a placeholder for a sweep that does not exist yet.</strong> It is
    /// charged against <see cref="EngineSettings.MaintenanceInterval"/> because the mailbox closure
    /// sweep, when it arrives, is expected to ride that cadence — but if it is given its own, coarser
    /// setting instead, this term must be repointed at that setting here and in the remarks on
    /// <see cref="EngineSettings.MaxMailboxTimeout"/>. A sweep running slower than the term charged for
    /// it lets a receiver park past the bound while every assertion below stays green.
    /// </para>
    /// </remarks>
    private static TimeSpan BoundedWorstCaseReceiverLifetime(EngineSettings settings) =>
        settings.MaxMailboxTimeout
        + settings.MaintenanceInterval
        + settings.MaxStepWaitBudget
        + settings.Retention.RetentionPeriod
        + settings.MaxStepWaitBudget
        + (settings.DefaultStepRetryStrategy.MaxDuration ?? TimeSpan.Zero);

    [Fact]
    public void BoundedWorstCaseReceiverLifetime_StaysWithinTheGuaranteedTokenValidity()
    {
        var settings = Defaults.EngineSettings;
        var worstCase = BoundedWorstCaseReceiverLifetime(settings);

        Assert.True(
            worstCase < _guaranteedTokenValidityAtEnqueue,
            $"Bounded worst-case receive-workflow lifetime is {worstCase.TotalDays:0.##}d, which exceeds the "
                + $"{_guaranteedTokenValidityAtEnqueue.TotalDays:0.##}d of callback-token validity guaranteed at "
                + "enqueue, so a parked receiver would fail to authenticate when it finally runs. Give the "
                + "callback token a refresh path before raising MaxMailboxTimeout, MaxStepWaitBudget or the "
                + "retention period."
        );
    }

    [Fact]
    public void BoundedWorstCaseReceiverLifetime_MatchesTheDerivationOnMaxMailboxTimeout()
    {
        // Pinned exactly, not as an inequality, so that movement in *either* direction fails: the
        // arithmetic written down on EngineSettings.MaxMailboxTimeout is the artifact under test, and a
        // number that quietly drifts down is as much a documentation bug as one that drifts up.
        var settings = Defaults.EngineSettings;

        Assert.Equal(TimeSpan.FromDays(21), settings.MaxMailboxTimeout);
        Assert.Equal(TimeSpan.FromDays(110) + TimeSpan.FromMinutes(1), BoundedWorstCaseReceiverLifetime(settings));
    }
}
