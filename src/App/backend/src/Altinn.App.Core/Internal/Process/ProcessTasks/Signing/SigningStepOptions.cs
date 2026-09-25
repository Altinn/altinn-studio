using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.Signing;

/// <summary>
/// Step options for the signing task's commands. Every one of them calls platform services, so each gets a
/// timeout sized for several sequential calls and a retry budget bounded by a count rather than a duration: the
/// engine anchors a duration budget on the previous step's completion and does not re-anchor it on resume, so a
/// step resumed hours later would otherwise have no retries left. Fifty exponential retries capped at five
/// minutes apart is roughly four hours, and resume grants a fresh allowance.
/// </summary>
internal static class SigningStepOptions
{
    private static readonly ProcessStepRetryStrategy _retry = ProcessStepRetryStrategy.Exponential(
        TimeSpan.FromSeconds(2),
        maxRetries: 50,
        maxDelay: TimeSpan.FromMinutes(5)
    );

    /// <summary>For the resolve step: the app's provider plus one Register lookup per signee.</summary>
    public static ProcessStepOptions ProviderAndRegisterCalls { get; } =
        new() { MaxExecutionTime = TimeSpan.FromMinutes(2), RetryStrategy = _retry };

    /// <summary>For the delegate and notify steps: one Access Management or Correspondence call per signee.</summary>
    public static ProcessStepOptions PlatformCallsPerSignee { get; } =
        new() { MaxExecutionTime = TimeSpan.FromMinutes(5), RetryStrategy = _retry };
}
