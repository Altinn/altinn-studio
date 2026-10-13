using System.Diagnostics.CodeAnalysis;

namespace Altinn.Studio.Assistant.Runner;

internal interface IJobRunner
{
    /// <summary>Runs <paramref name="command"/> on the app in <paramref name="archive"/>, a gzip tar.</summary>
    Task<JobOutcome> RunAsync(JobCommand command, Stream archive, CancellationToken cancellationToken);
}

internal enum JobCommand
{
    UpgradeToV9,
    Build,
}

[SuppressMessage("Major Code Smell", "S2094", Justification = "The base of a closed set of job outcomes.")]
internal abstract record JobOutcome;

/// <summary>
/// <see cref="ExitCode"/> is null when the command timed out. <see cref="Patch"/> holds the changes
/// of an upgrade, and the JSON response has it as base64, because a patch can hold content that is
/// not UTF-8.
/// </summary>
internal sealed record JobResult(int? ExitCode, bool TimedOut, string Stdout, string Stderr, byte[]? Patch)
    : JobOutcome;

/// <summary>The archive did not extract, so the command did not run.</summary>
internal sealed record InvalidArchive(string Detail) : JobOutcome;
