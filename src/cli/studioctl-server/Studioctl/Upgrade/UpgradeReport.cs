namespace Altinn.Studio.Cli.Upgrade;

/// <summary>
/// Why a message is being shown. Rendering - colour, label, layout - is the CLI's job; this only says
/// what the message means.
/// </summary>
internal enum UpgradeMessageStatus
{
    /// <summary>Neutral information, such as a count or a statistic.</summary>
    Info,

    /// <summary>A migration operation was applied, or a check ran and found nothing wrong.</summary>
    Ok,

    /// <summary>A migration that was not needed for this app.</summary>
    Skip,

    /// <summary>Something the user should look at, but the upgrade did what it could.</summary>
    Warning,

    /// <summary>The upgrade could not do this automatically; the user has to finish it by hand.</summary>
    Todo,

    /// <summary>
    /// The step tried and failed. This says nothing about the process exit code - failure is still
    /// decided by the exit codes in the upgrade paths themselves.
    /// </summary>
    Failed,
}

/// <summary>One reported message: a single line of text plus why it is being shown.</summary>
internal sealed record UpgradeMessage(string Text, UpgradeMessageStatus Status);

/// <summary>One migration step and everything it reported, in emission order.</summary>
internal sealed record UpgradeStep(string Name, IReadOnlyList<UpgradeMessage> Messages);

/// <summary>
/// Collects the structured result of an upgrade run: every step in the order it began, each with the
/// messages it reported. A step that reported nothing still appears - its bare name shows the step ran.
/// </summary>
/// <remarks>Not thread-safe: an upgrade run reports its steps and messages sequentially.</remarks>
internal sealed class UpgradeReport
{
    private readonly List<StepState> _steps = [];

    /// <summary>Steps, in the order they began.</summary>
    public IReadOnlyList<UpgradeStep> Steps =>
        [.. _steps.Select(step => new UpgradeStep(step.Name, [.. step.Messages]))];

    /// <summary>Whether any step has begun, and so whether this run is reporting into the report at all.</summary>
    public bool HasSteps => _steps.Count > 0;

    /// <summary>Starts a step and adds it to the report.</summary>
    internal StepState BeginStep(string name)
    {
        var step = new StepState(name);
        _steps.Add(step);
        return step;
    }

    /// <summary>The mutable backing of one step.</summary>
    internal sealed class StepState(string name)
    {
        internal string Name { get; } = name;

        internal List<UpgradeMessage> Messages { get; } = [];

        internal void Add(string text, UpgradeMessageStatus status) => Messages.Add(new UpgradeMessage(text, status));
    }
}
