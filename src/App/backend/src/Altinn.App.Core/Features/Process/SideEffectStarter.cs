namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Starts side effects (<see cref="ISideEffect"/>) from the code a step runs: a hook, a process task, a service
/// task stage or another side effect. Available on each of their contexts as <c>SideEffects</c>.
/// </summary>
/// <remarks>
/// <para>
/// A started side effect runs only if the step's work is saved, and starts once it is: a hook or process task
/// that runs before the transition is saved starts its side effects right after the transition is saved, and a
/// step that runs after it starts them right after its own save. If the step fails, or the transition never
/// saves, nothing starts. A step that defers must not start anything.
/// </para>
/// <para>
/// A step may run again, so it starts the same side effects with the same input every time it succeeds.
/// Starting is idempotent per step: running a step again starts nothing twice.
/// </para>
/// </remarks>
public sealed class SideEffectStarter
{
    private readonly List<StartedSideEffect> _started = [];

    /// <summary>
    /// Starts the registered side effect of type <typeparamref name="TSideEffect"/> with <paramref name="input"/>,
    /// which it reads with <see cref="ServiceTaskContext.GetInput{T}"/>.
    /// </summary>
    /// <param name="input">
    /// The side effect's input, or <c>null</c> for none. It travels as JSON (<c>System.Text.Json</c> web
    /// defaults), so keep it small and serializable.
    /// </param>
    public void Start<TSideEffect>(object? input = null)
        where TSideEffect : ISideEffect => _started.Add(new StartedSideEffect(typeof(TSideEffect), input));

    /// <summary>The side effects started so far, in the order they were started.</summary>
    public IReadOnlyList<StartedSideEffect> Started => _started;
}

/// <summary>One side effect a step started.</summary>
/// <param name="SideEffect">The side effect's type, as registered.</param>
/// <param name="Input">The input it was started with, or <c>null</c>.</param>
public sealed record StartedSideEffect(Type SideEffect, object? Input);
