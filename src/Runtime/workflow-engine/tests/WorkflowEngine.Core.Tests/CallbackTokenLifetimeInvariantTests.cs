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
    /// <strong>The sweep term names the cadence the closure sweep actually runs on</strong> —
    /// <see cref="EngineSettings.MailboxSweepInterval"/>, which the sweep was given rather than riding the
    /// maintenance cadence, because a deadline is a day-scale promise and does not want a minute-scale
    /// timer. Naming the setting is what keeps the arithmetic honest: raising it raises the worst case
    /// here too, so a sweep made slower than this bound allows fails loudly instead of quietly letting a
    /// receiver park past its token's validity. It is pinned to the service by
    /// <c>MailboxSweepTests.SweepService_RunsOnTheMailboxSweepInterval_NotTheMaintenanceInterval</c>,
    /// without which the setting could be raised here while the sweep went on running on some other
    /// clock.
    /// </para>
    /// </remarks>
    private static TimeSpan BoundedWorstCaseReceiverLifetime(EngineSettings settings) =>
        settings.MaxMailboxTimeout
        + settings.MailboxSweepInterval
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
        Assert.Equal(TimeSpan.FromMinutes(5), settings.MailboxSweepInterval);
        Assert.Equal(TimeSpan.FromDays(110) + TimeSpan.FromMinutes(5), BoundedWorstCaseReceiverLifetime(settings));
    }

    [Fact]
    public void TheDerivationsMailboxTerms_AreSourcedFromDefaults_NotFromPropertyInitializers()
    {
        // Both tests above read Defaults.EngineSettings, so they only guard the engine's real behavior
        // while Defaults is what the engine really runs on. It is not automatically: EngineSettings is a
        // plain settings object whose properties may carry initializers, and the normalizer only reaches
        // for Defaults when a value is non-positive — so an initializer is the value that actually runs
        // when nothing is configured, and a tripwire reading Defaults would go on guarding a number the
        // engine had stopped using.
        //
        // The two terms are held to different standards, deliberately. MailboxSweepInterval must carry no
        // initializer at all, so Defaults is not merely in agreement but is the only source there is —
        // the stricter rule, and affordable because this step introduced the setting. MaxMailboxTimeout
        // inherited its initializer from step 1 and is held to the weaker rule that it agree with Defaults,
        // so that which of the two wins cannot matter. Mutating either number on its own reddens this.
        var unnormalized = UnnormalizedSettings();

        Assert.True(
            unnormalized.MailboxSweepInterval <= TimeSpan.Zero,
            "EngineSettings.MailboxSweepInterval has grown a property initializer. That value, not "
                + "Defaults.EngineSettings, is now what runs when nothing is configured — so the "
                + "callback-token bound above is guarding a cadence the sweep no longer uses. Drop the "
                + "initializer and let the settings normalizer source this from Defaults, as the "
                + "neighboring timer settings do."
        );

        Assert.Equal(Defaults.EngineSettings.MaxMailboxTimeout, unnormalized.MaxMailboxTimeout);
    }

    /// <summary>
    /// An <see cref="EngineSettings"/> exactly as the type constructs itself — required members supplied
    /// because the compiler insists, and nothing else touched. This is what a host gets before the settings
    /// normalizer runs, and therefore what it keeps for any value the normalizer decides is already set.
    /// </summary>
    private static EngineSettings UnnormalizedSettings() =>
        new()
        {
            MaxWorkflowsPerRequest = 1,
            MaxStepsPerWorkflow = 1,
            MaxLabels = 1,
            MetricsCollectionInterval = TimeSpan.FromSeconds(1),
            DefaultStepCommandTimeout = TimeSpan.FromSeconds(1),
            MaxStepCommandTimeout = TimeSpan.FromSeconds(1),
            DefaultStepRetryStrategy = null!,
            DatabaseCommandTimeout = TimeSpan.FromSeconds(1),
            DatabaseRetryStrategy = null!,
            HeartbeatInterval = TimeSpan.FromSeconds(1),
            StaleWorkflowThreshold = TimeSpan.FromSeconds(1),
            MaxReclaimCount = 1,
        };
}
