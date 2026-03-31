namespace WorkflowEngine.Core;

internal abstract record SizeLimitValidationResult
{
    private SizeLimitValidationResult() { }

    /// <summary>
    /// Indicates that the request is within size limits.
    /// </summary>
    internal sealed record Valid : SizeLimitValidationResult;

    /// <summary>
    /// Indicates that the request exceeds size limits.
    /// </summary>
    internal sealed record Invalid(string Message) : SizeLimitValidationResult;
}
