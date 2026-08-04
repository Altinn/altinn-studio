namespace Altinn.App.Core.Features.Process;

/// <summary>
/// The type-erased outcome of invoking one pipeline step, produced by
/// <see cref="IServiceTaskStep"/>'s internal <c>Invoke</c> and consumed by the runtime's
/// service-task executor. This is where the typed step results of all three step shapes converge
/// into one closed set the executor can map onto engine semantics.
/// </summary>
internal abstract record ServiceTaskStepOutcome
{
    private ServiceTaskStepOutcome() { }

    /// <summary>A non-final step completed; <see cref="Output"/> is the next step's input.</summary>
    internal sealed record Next(object Output) : ServiceTaskStepOutcome;

    /// <summary>The final step ran; <see cref="Result"/> concludes the task.</summary>
    internal sealed record Final(ServiceTaskResult Result) : ServiceTaskStepOutcome;

    /// <summary>The step defers: run it again after <see cref="Delay"/> with the same input.</summary>
    internal sealed record Deferred(TimeSpan Delay, string? Reason) : ServiceTaskStepOutcome;

    /// <summary>The step failed.</summary>
    internal sealed record Failed(string ErrorMessage, FailureKind Kind) : ServiceTaskStepOutcome;
}
