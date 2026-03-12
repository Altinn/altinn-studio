namespace WorkflowEngine.Models;

public abstract record SizeLimitValidationResult
{
    private SizeLimitValidationResult() { }

    public static Valid Accept() => new();

    public static Invalid Reject(string message) => new(message);

    /// <summary>
    /// Indicates that the request is within size limits.
    /// </summary>
    public sealed record Valid : SizeLimitValidationResult { }

    /// <summary>
    /// Indicates that the request exceeds size limits.
    /// </summary>
    public sealed record Invalid(string Message) : SizeLimitValidationResult { }
}
