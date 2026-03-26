#pragma warning disable CA1032 // Standard exception constructors are intentionally omitted — this exception requires domain-specific parameters

namespace WorkflowEngine.Models.Exceptions;

/// <summary>
/// Thrown when an idempotency key has already been used with a different request body.
/// </summary>
public sealed class IdempotencyConflictException : EngineException
{
    public string IdempotencyKey { get; }

    public IdempotencyConflictException(string idempotencyKey)
        : base($"Idempotency key '{idempotencyKey}' was already used with a different request body.")
    {
        IdempotencyKey = idempotencyKey;
    }
}
