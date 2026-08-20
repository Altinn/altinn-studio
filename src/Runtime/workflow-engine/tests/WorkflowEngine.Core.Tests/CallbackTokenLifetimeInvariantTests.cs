using WorkflowEngine.Core.Constants;
using WorkflowEngine.Models;

namespace WorkflowEngine.Core.Tests;

/// <summary>
/// Tripwire for the cross-component invariant that bounds how long the engine may keep a workflow alive:
/// AppCommand callback tokens are minted once at enqueue and never refresh, so every callback the engine will
/// ever make has to happen inside the signing app-code's remaining validity.
/// </summary>
/// <remarks>
/// The engine cannot read that validity — it is a property of the operator's app-code rotation policy in
/// <c>src/Runtime/operator/internal/controller/appcodesync/controller.go</c> (186d acceptance, 72d rotation),
/// which guarantees at least 114 days — so the invariant is asserted against that floor as a named constant,
/// and a change to the controller's constants has this file as its grep target. Without it, raising the wait
/// budget, the mailbox timeout or the retention period would surface only as receive workflows failing to
/// authenticate weeks after enqueue.
/// </remarks>
public class CallbackTokenLifetimeInvariantTests
{
    /// <summary>
    /// Remaining validity guaranteed for a freshly minted callback token: the operator's app-code acceptance
    /// window (186d) minus its rotation interval (72d).
    /// </summary>
    private static readonly TimeSpan _guaranteedTokenValidityAtEnqueue = TimeSpan.FromDays(114);

    /// <summary>
    /// The worst-case lifetime of a receive workflow, measured from the moment its own callback token is minted —
    /// its enqueue. In order: it parks for the mailbox's entire lifetime; the closure sweep's cadence elapses; the
    /// released receiver waits out a full step wait budget; it fails, sits until the terminal-retention edge and is
    /// resumed there, replaying the original token; it waits out a second full budget; and it exhausts its retry
    /// ladder.
    /// </summary>
    /// <remarks>
    /// The anchor is what makes this different from an inherited-token design's, and is the entire justification
    /// for <see cref="EngineSettings.MaxMailboxTimeout"/> being as large as it is: a receive workflow carries a
    /// fresh token, so no wait an ancestor spent counts here and a relay's next hop is a new workflow with a new
    /// token. The sweep term names <see cref="EngineSettings.MailboxSweepInterval"/> so that a sweep made slower
    /// than this bound allows fails loudly; it is pinned to the service by
    /// <c>MailboxSweepTests.SweepService_RunsOnTheMailboxSweepInterval_NotTheMaintenanceInterval</c>. One looseness
    /// is left uncounted and predates mailboxes: the wait budget is per step.
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
        // Pinned exactly rather than as an inequality, so movement in either direction fails: the arithmetic
        // written down on EngineSettings.MaxMailboxTimeout is the artifact under test.
        var settings = Defaults.EngineSettings;

        Assert.Equal(TimeSpan.FromDays(21), settings.MaxMailboxTimeout);
        Assert.Equal(TimeSpan.FromMinutes(5), settings.MailboxSweepInterval);
        Assert.Equal(TimeSpan.FromDays(110) + TimeSpan.FromMinutes(5), BoundedWorstCaseReceiverLifetime(settings));
    }

    [Fact]
    public void TheDerivationsMailboxTerms_AreSourcedFromDefaults_NotFromPropertyInitializers()
    {
        // Both tests above read Defaults.EngineSettings, which only guards the engine's real behavior while
        // Defaults is what the engine really runs on — the normalizer reaches for Defaults only when a value is
        // non-positive, so a property initializer would win and leave the tripwire guarding a number nothing
        // uses. MailboxSweepInterval must carry no initializer at all; MaxMailboxTimeout inherited one and is
        // held to the weaker rule that it agree with Defaults.
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
    /// An <see cref="EngineSettings"/> exactly as the type constructs itself, which is what a host gets before the
    /// settings normalizer runs — and therefore what it keeps for any value the normalizer considers already set.
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
