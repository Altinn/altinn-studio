#pragma warning disable CA1032 // Standard exception constructors are intentionally omitted — this exception requires domain-specific parameters

namespace WorkflowEngine.Models.Exceptions;

/// <summary>
/// Thrown when an idempotency key has already been used with a different request body.
/// </summary>
public sealed class IdempotencyConflictException : EngineException
{
    /// <summary>
    /// The idempotency key that produced the conflict.
    /// </summary>
    public string IdempotencyKey { get; }

    /// <summary>
    /// Creates a new <see cref="IdempotencyConflictException"/> for the given idempotency key.
    /// </summary>
    public IdempotencyConflictException(string idempotencyKey)
        : base($"Idempotency key '{idempotencyKey}' was already used with a different request body.")
    {
        IdempotencyKey = idempotencyKey;
    }
}
