namespace WorkflowEngine.Core;

internal abstract record RequestConstraintValidationResult
{
    private RequestConstraintValidationResult() { }

    /// <summary>
    /// Indicates that the request satisfies the lightweight request-level constraints.
    /// </summary>
    internal sealed record Valid : RequestConstraintValidationResult;

    /// <summary>
    /// Indicates that the request violates a lightweight request-level constraint.
    /// </summary>
    internal sealed record Invalid(string Message) : RequestConstraintValidationResult;
}
