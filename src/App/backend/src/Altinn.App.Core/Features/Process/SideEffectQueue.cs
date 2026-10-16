namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Enqueues side effects (<see cref="ISideEffect"/>) from the code a step runs: a hook, a process task, a service
/// task stage or another side effect. Available on each of their contexts as <c>SideEffects</c>.
/// </summary>
/// <remarks>
/// <para>
/// Enqueuing runs nothing yet: an enqueued side effect runs only if the step's work is saved, and starts once it
/// is. A hook or process task that runs before the transition is saved has its side effects started right after
/// the transition is saved, and a step that runs after it has them started right after its own save. If the step
/// fails, or the transition never saves, nothing starts. A step that defers must not enqueue anything.
/// </para>
/// <para>
/// A step may run again, so it enqueues the same side effects with the same input every time it succeeds.
/// Enqueuing is idempotent per step: running a step again starts nothing twice.
/// </para>
/// </remarks>
public sealed class SideEffectQueue
{
    private readonly List<EnqueuedSideEffect> _enqueued = [];

    /// <summary>
    /// Enqueues the registered side effect of type <typeparamref name="TSideEffect"/> with <paramref name="input"/>,
    /// which it reads with <see cref="ServiceTaskContext.GetInput{T}"/>.
    /// </summary>
    /// <param name="input">
    /// The side effect's input, or <c>null</c> for none. It travels as JSON (<c>System.Text.Json</c> web
    /// defaults), so keep it small and serializable.
    /// </param>
    public void Enqueue<TSideEffect>(object? input = null)
        where TSideEffect : ISideEffect => _enqueued.Add(new EnqueuedSideEffect(typeof(TSideEffect), input));

    /// <summary>The side effects enqueued so far, in the order they were enqueued.</summary>
    public IReadOnlyList<EnqueuedSideEffect> Enqueued => _enqueued;
}

/// <summary>One side effect a step enqueued.</summary>
/// <param name="SideEffect">The side effect's type, as registered.</param>
/// <param name="Input">The input it was enqueued with, or <c>null</c>.</param>
public sealed record EnqueuedSideEffect(Type SideEffect, object? Input);
