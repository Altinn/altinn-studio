using WorkflowEngine.Core.Constants;
using WorkflowEngine.Models;

namespace WorkflowEngine.Core.Tests;

/// <summary>
/// Tripwire for the token-lifetime bound: callback tokens are minted once at enqueue and never refresh, so a
/// receive workflow's worst-case lifetime must fit inside the signing app-code's guaranteed remaining validity
/// (operator rotation policy in <c>src/Runtime/operator/internal/controller/appcodesync/controller.go</c>:
/// 186d acceptance − 72d rotation = 114d). Raising the wait budget, the mailbox timeout or retention past the
/// floor would otherwise surface only as receivers failing to authenticate weeks after enqueue.
/// </summary>
public class CallbackTokenLifetimeInvariantTests
{
    /// <summary>The operator's acceptance window (186d) minus its rotation interval (72d).</summary>
    private static readonly TimeSpan _guaranteedTokenValidityAtEnqueue = TimeSpan.FromDays(114);

    /// <summary>
    /// The worst-case lifetime of a receive workflow, from its own enqueue: park for the mailbox's lifetime,
    /// plus one closure-sweep cadence, a full step wait budget, a resume at the terminal-retention edge
    /// replaying the original token, a second full budget, and the retry ladder. The sweep term names
    /// <see cref="EngineSettings.MailboxSweepInterval"/> so a slower sweep fails this bound loudly.
    /// </summary>
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
        // Pinned exactly rather than as an inequality, so movement in either direction fails.
        var settings = Defaults.EngineSettings;

        Assert.Equal(TimeSpan.FromDays(21), settings.MaxMailboxTimeout);
        Assert.Equal(TimeSpan.FromMinutes(5), settings.MailboxSweepInterval);
        Assert.Equal(TimeSpan.FromDays(110) + TimeSpan.FromMinutes(5), BoundedWorstCaseReceiverLifetime(settings));
    }

    [Fact]
    public void TheDerivationsMailboxTerms_AreSourcedFromDefaults_NotFromPropertyInitializers()
    {
        // The tests above read Defaults.EngineSettings, but a property initializer would win over Defaults in
        // a host that configures nothing — so the tripwire would guard a number the engine stopped using.
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
    /// An <see cref="EngineSettings"/> exactly as the type constructs itself — what a host gets before the
    /// settings normalizer runs.
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
